FROM goalert/build-env:go1.16.7-postgres13

RUN apk -u add fish sudo

RUN addgroup -g 1000 dev && adduser -u 1000 -G dev -D -s /usr/bin/fish dev && echo '%wheel ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/wheel && adduser dev wheel

RUN su dev -c "go get github.com/uudashr/gopkgs/v2/cmd/gopkgs"
RUN su dev -c "go get github.com/ramya-rao-a/go-outline"
RUN su dev -c "go get github.com/cweill/gotests/gotests"
RUN su dev -c "go get github.com/fatih/gomodifytags"
RUN su dev -c "go get github.com/josharian/impl"
RUN su dev -c "go get github.com/haya14busa/goplay/cmd/goplay"
RUN su dev -c "go get github.com/go-delve/delve/cmd/dlv"
RUN su dev -c "go get github.com/go-delve/delve/cmd/dlv@master"
RUN su dev -c "go get honnef.co/go/tools/cmd/staticcheck"
RUN su dev -c "go get golang.org/x/tools/gopls"
