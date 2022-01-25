FROM aliprod-reg.llsops.com/library/alpine:latest
RUN apk --no-cache add ca-certificates
ENV GOALERT_LISTEN :8081
EXPOSE 8081
CMD ["/usr/bin/goalert", "-h"]

COPY bin/goalert-linux-amd64 /usr/bin/goalert
#RUN /usr/bin/goalert self-test
