FROM goalert/build-env:go1.16.7-postgres13

RUN apk -u add fish sudo gcc

RUN addgroup -g 1000 dev && adduser -u 1000 -G dev -D -s /usr/bin/fish dev && echo '%wheel ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/wheel && adduser dev wheel

