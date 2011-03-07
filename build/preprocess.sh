# Paper.js
#
# This file is part of Paper.js, a JavaScript Vector Graphics Library,
# based on Scriptographer.org and designed to be largely API compatible.
# http://scriptographer.org/
#
# Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
# http://lehni.org/ & http://jonathanpuckey.com/
#
# All rights reserved. See LICENSE file for details.

# preprocess.sh
#
# A simple code preprocessing wrapper that uses a combination of cpp, jssrip.py
# and sed to preprocess JavaScript files containing C-style preprocess macros
# (#include, #ifdef, etc.). Three options offer control over wether comments
# are preserved or stripped and whitespaces are compressed.
#
# Usage:
# preprocess.sh SOURCE DESTINATION ARGUMENTS MODE
#
# ARGUMENTS:
#	e.g. "-DBROWSER"
#
# MODE:
#	commented		Preprocessed but still formated and commented (default)
#	stripped		Formated but without comments
#	compressed		No comments and no whitespaces
#	compiled		Uses Google Closure Compiler to reduce file size even more

KEYWORD="//#"

case $4 in
	stripped)
		./filepp.pl -kc $KEYWORD $3 $1 | ./jsstrip.pl -w -q | sed -n '/^[ 	][ 	]*$/d
			/./,/^$/!d
			p' > $2
		;;
	compressed)
		./filepp.pl -kc $KEYWORD $3 $1 | ./jsstrip.pl -q > $2
		;;
	commented)
		./filepp.pl -kc $KEYWORD $3 $1 | sed -n '/^[ 	][ 	]*$/d
			/./,/^$/!d
			p' > $2
		;;
	compiled)
		./filepp.pl -kc $KEYWORD $3 $1 > temp.js
		java -jar compiler.jar --js temp.js --js_output_file $2
		rm temp.js
		;;
esac
