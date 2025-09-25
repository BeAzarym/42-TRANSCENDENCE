FROM alpine:3.22.0

RUN apk update && apk upgrade
RUN apk add nginx

RUN mkdir -p /etc/nginx/ssl
RUN apk add openssl
RUN openssl req -x509 -nodes -out /etc/nginx/ssl/transcendence.crt -keyout /etc/nginx/ssl/transcendence.key -subj "/C=BE/ST=Bruxelles-Capitale/L=Bruxelles/O=19/OU=19/CN=change-me/UID=fghysbre"

RUN mkdir -p /var/run/nginx
COPY conf/nginx.conf /etc/nginx/nginx.conf

RUN chmod 755 /var/www/localhost
RUN chown -R nginx:nginx /var/www/localhost

EXPOSE 80 443

CMD [ "nginx", "-g", "daemon off;" ]