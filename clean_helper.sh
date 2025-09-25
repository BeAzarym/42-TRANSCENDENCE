log() {
	if [ $verbose -ne 0 ]; then
		echo "$1"
	fi
}

deletefolder() {
	path2="$1/$2"

	if [ -d $path2 ]; then
		log "$name: $2 folder found, deleting..."
		rm -rf $path2
		log "$name: $2 folder deleted"
	else
		log "$name: $2 folder not found"
	fi

	return;
}

deletefile() {
	path3="$1/$2"

	if [ -f $path3 ]; then
		log "$name: $2 file found, deleting..."
		rm -rf $path3
		log "$name: $2 file deleted"
	else
		log "$name: $2 file not found"
	fi

	return;
}

cleanPath() {
	name="$1"
	path="srcs/requirements/$1/data"
	log "started cleaning: $name (path: $path)"

	deletefolder $path "node_modules"
	deletefolder $path "dist"
	deletefolder $path "coverage"
	deletefile $path "package-lock.json"

	log "finised cleaning: $name"

	return ;
}

verbose=0
while getopts "v" opt; do
	case "$opt" in
		v) verbose=$((verbose + 1)) ;;
		\?) echo "Unkown option: -$OPTARG" >&2; exit 2 ;;
	esac
done

cleanPath auth
cleanPath database
cleanPath front
cleanPath leaderboard
cleanPath pong
cleanPath profile
cleanPath social