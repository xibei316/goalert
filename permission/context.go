package permission

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"sync/atomic"

	"github.com/target/goalert/util/log"

	"go.opencensus.io/trace"
)

// SourceContext will return a context with the provided SourceInfo.
func SourceContext(ctx context.Context, src *SourceInfo) context.Context {
	if src == nil {
		return ctx
	}
	// make a copy, so it's read-only
	dup := *src
	ctx = log.WithField(ctx, "AuthSource", src.String())
	return context.WithValue(ctx, contextKeySourceInfo, dup)
}

// Source will return the SourceInfo associated with a context.
func Source(ctx context.Context) *SourceInfo {
	src, ok := ctx.Value(contextKeySourceInfo).(SourceInfo)
	if !ok {
		return nil
	}
	return &src
}

func sourceAttrs(ctx context.Context, extra ...trace.Attribute) []trace.Attribute {
	src := Source(ctx)
	if src == nil {
		return extra
	}
	return append([]trace.Attribute{
		trace.StringAttribute("auth.source.type", src.Type.String()),
		trace.StringAttribute("auth.source.id", src.ID),
	}, extra...)
}

// UserSourceContext behaves like UserContext, but provides SourceInfo about the authorization.
func UserSourceContext(ctx context.Context, id string, r Role, src *SourceInfo) context.Context {
	ctx = SourceContext(ctx, src)
	ctx = UserContext(ctx, id, r)
	return ctx
}

// UserContext will return a context authenticated with the users privileges.
func UserContext(ctx context.Context, id string, r Role) context.Context {
	id = strings.ToLower(id)
	ctx = context.WithValue(ctx, contextHasAuth, 1)
	ctx = context.WithValue(ctx, contextKeyUserID, id)
	ctx = ensureAuthCheckCountContext(ctx)
	ctx = context.WithValue(ctx, contextKeyUserRole, r)
	ctx = log.WithField(ctx, "AuthUserID", id)
	trace.FromContext(ctx).Annotate(sourceAttrs(ctx,
		trace.StringAttribute("auth.user.id", id),
		trace.StringAttribute("auth.user.role", string(r)),
	), "Authorized as User.")
	return ctx
}

var sysRx = regexp.MustCompile(`^([a-zA-Z0-9]+|Sudo\[[a-zA-Z0-9]+\])$`)

// SystemContext will return a new context with the system privileges.
// Name must be alphanumeric.
func SystemContext(ctx context.Context, componentName string) context.Context {
	if !sysRx.MatchString(componentName) {
		panic(errors.New("invalid system component name: " + componentName))
	}
	ctx = context.WithValue(ctx, contextHasAuth, 1)
	ctx = context.WithValue(ctx, contextKeySystem, componentName)
	ctx = AuthCheckCountContext(ctx, 0)
	ctx = log.WithField(ctx, "AuthSystemComponent", componentName)
	trace.FromContext(ctx).Annotate([]trace.Attribute{trace.StringAttribute("auth.system.componentName", componentName)}, "Authorized as System.")
	return ctx
}

// AuthCheckCount will return the current number of authorization checks as
// well as the maximum.
func AuthCheckCount(ctx context.Context) (value, max uint64) {
	val, ok := ctx.Value(contextKeyCheckCount).(*uint64)
	if ok {
		value = atomic.LoadUint64(val)
	}

	max, _ = ctx.Value(contextKeyCheckCountMax).(uint64)

	return value, max
}

func ensureAuthCheckCountContext(ctx context.Context) context.Context {
	_, ok := ctx.Value(contextKeyCheckCount).(*uint64)
	if !ok {
		return AuthCheckCountContext(ctx, 0)
	}
	return ctx
}

// AuthCheckCountContext will return a new context with the AuthCheckCount maximum
// set to the provided value. If max is 0, there will be no limit.
func AuthCheckCountContext(ctx context.Context, max uint64) context.Context {
	val, _ := ctx.Value(contextKeyCheckCount).(*uint64)
	if val == nil {
		ctx = context.WithValue(ctx, contextKeyCheckCount, new(uint64))
	}
	ctx = context.WithValue(ctx, contextKeyCheckCountMax, max)

	return ctx
}

// ServiceSourceContext behaves like ServiceContext, but provides SourceInfo about the authorization.
func ServiceSourceContext(ctx context.Context, id string, src *SourceInfo) context.Context {
	ctx = SourceContext(ctx, src)
	ctx = ServiceContext(ctx, id)
	return ctx
}

// ServiceContext will return a new context with privileges for the given service.
func ServiceContext(ctx context.Context, serviceID string) context.Context {
	serviceID = strings.ToLower(serviceID)
	ctx = context.WithValue(ctx, contextHasAuth, 1)
	ctx = ensureAuthCheckCountContext(ctx)
	ctx = context.WithValue(ctx, contextKeyServiceID, serviceID)
	ctx = log.WithField(ctx, "AuthServiceID", serviceID)

	trace.FromContext(ctx).Annotate(sourceAttrs(ctx,
		trace.StringAttribute("auth.service.id", serviceID),
	), "Authorized as Service.")

	return ctx
}

// TeamContext will return a new context with privileges for the given team.
func TeamContext(ctx context.Context, teamID string) context.Context {
	teamID = strings.ToLower(teamID)
	ctx = context.WithValue(ctx, contextHasAuth, 1)
	ctx = context.WithValue(ctx, contextKeyCheckCount, new(uint64))
	ctx = context.WithValue(ctx, contextKeyTeamID, teamID)
	ctx = log.WithField(ctx, "AuthTeamID", teamID)

	return ctx
}

// WithoutAuth returns a context will all auth info stripped out.
func WithoutAuth(ctx context.Context) context.Context {
	if System(ctx) {
		ctx = context.WithValue(ctx, contextKeySystem, nil)
	}
	if id, ok := ctx.Value(contextKeyUserID).(string); ok && id != "" {
		ctx = context.WithValue(ctx, contextKeyUserID, nil)
		ctx = context.WithValue(ctx, contextKeyUserRole, nil)
	}
	if Service(ctx) {
		ctx = context.WithValue(ctx, contextKeyServiceID, nil)
	}

	v, _ := ctx.Value(contextHasAuth).(int)
	if v == 1 {
		ctx = context.WithValue(ctx, contextHasAuth, nil)
	}
	trace.FromContext(ctx).Annotate(
		nil,
		"Authorization dropped.",
	)
	return ctx
}

// SudoContext elevates an existing context to system level. The elevated context is automatically cancelled
// as soon as the callback returns.
func SudoContext(ctx context.Context, f func(context.Context)) {
	name := "Sudo"
	cname := SystemComponentName(ctx)
	if cname != "" {
		name += "[" + cname + "]"
	}
	sCtx, span := trace.StartSpan(ctx, "Auth.Sudo")
	defer span.End()
	sCtx, cancel := context.WithCancel(SystemContext(sCtx, name))
	defer cancel()
	f(sCtx)
}

func userRole(ctx context.Context) Role {
	role, _ := ctx.Value(contextKeyUserRole).(Role)
	return role
}

// UserID will return the UserID associated with a context.
func UserID(ctx context.Context) string {
	uid, _ := ctx.Value(contextKeyUserID).(string)
	return uid
}

// SystemComponentName will return the component name used to initiate a context.
func SystemComponentName(ctx context.Context) string {
	name, _ := ctx.Value(contextKeySystem).(string)
	return name
}

// ServiceID will return the ServiceID associated with a context.
func ServiceID(ctx context.Context) string {
	sid, _ := ctx.Value(contextKeyServiceID).(string)
	return sid
}

// TeamID will return the TeamID associated with a context.
func TeamID(ctx context.Context) string {
	sid, _ := ctx.Value(contextKeyTeamID).(string)
	return sid
}

func CopyPermissionContextValue(ctx context.Context) context.Context {
	nCtx := context.Background()
	nCtx = context.WithValue(nCtx, contextKeyUserRole, ctx.Value(contextKeyUserRole))
	nCtx = context.WithValue(nCtx, contextKeyCheckCount, ctx.Value(contextKeyCheckCount))
	nCtx = context.WithValue(nCtx, contextHasAuth, ctx.Value(contextHasAuth))
	nCtx = context.WithValue(nCtx, contextKeyCheckCountMax, ctx.Value(contextKeyCheckCountMax))
	return nCtx
}
