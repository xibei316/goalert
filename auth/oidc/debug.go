package oidc

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"sync/atomic"
)

func init() {
	http.DefaultTransport = &DebugTransport{
		RoundTripper: http.DefaultTransport,
	}
}

type DebugTransport struct {
	http.RoundTripper
}

var n int64

func (d *DebugTransport) RoundTrip(h *http.Request) (*http.Response, error) {
	if h.URL.Path == "/api/traces" {
		// skip tracing if in dev mode
		return d.RoundTripper.RoundTrip(h)
	}
	id := atomic.AddInt64(&n, 1)
	dump, _ := httputil.DumpRequestOut(h, true)
	fmt.Printf("\n\n****REQUEST START %04d****\n%s\n\n%s\n****REQUEST END %04d****\n\n", id, h.URL.String(), string(dump), id)
	resp, err := d.RoundTripper.RoundTrip(h)
	dump, _ = httputil.DumpResponse(resp, true)
	fmt.Printf("\n\n****RESPONSE START %04d****\n%s\n****RESPONSE END %04d****\n\n", id, string(dump), id)
	return resp, err
}
