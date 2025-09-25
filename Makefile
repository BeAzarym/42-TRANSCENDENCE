all:
	docker compose -f ./srcs/docker-compose.yml up --build -d

stop:
	docker compose -f ./srcs/docker-compose.yml stop

kill:
	docker compose -f ./srcs/docker-compose.yml kill

clean:
	sh ./clean_helper.sh

fclean:
	docker compose -f ./srcs/docker-compose.yml down --rmi all
	docker system prune -af

watch:
	docker compose -f ./srcs/docker-compose.yml up --build -w