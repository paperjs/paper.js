# Usage:
# build.sh MODE
#
# MODE:
#	commented		Preprocessed but still formated and commented
#	stripped		Formated but without comments (default)
#	compressed		No comments and no whitespaces
#	compiled		Uses Google Closure Compiler to reduce file size even more

if [ $# -eq 0 ]
then
	MODE="stripped"
else
	MODE=$1
fi

# Create the out folder if it does not exist yet.
if [ ! -d ../out/ ]
then
	mkdir ../out/
fi

./preprocess.sh ../src/paper.js ../out/paper-browser.js "-DBROWSER" $MODE
./preprocess.sh ../src/paper.js ../out/paper.js "" $MODE
