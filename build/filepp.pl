#!/usr/bin/perl -w
########################################################################
#
# filepp is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; see the file COPYING.  If not, write to
# the Free Software Foundation, 675 Mass Ave, Cambridge, MA 02139, USA.
#
########################################################################
#
#  Project      :  File Preprocessor
#  Filename     :  $RCSfile: filepp.in,v $
#  Author       :  $Author: darren $
#  Maintainer   :  Darren Miller: darren@cabaret.demon.co.uk
#  File version :  $Revision: 1.139 $
#  Last changed :  $Date: 2007/02/17 18:55:30 $
#  Description  :  Main program
#  Licence      :  GNU copyleft
#
########################################################################

package Filepp;

use strict "vars";
use strict "subs";
# Used to all filepp to work with any char, not just ascii,
# feel free to remove this if it causes you problems
use bytes;

# version number of program
my $VERSION = '1.8.0';

# list of paths to search for modules, normal Perl list + module dir
push(@INC, "/usr/local/share/filepp/modules");

# index of keywords supported and functions to deal with them
my %Keywords = (
		'comment' => \&Comment,
		'define'  => \&Define,
		'elif'    => \&Elif,
		'else'    => \&Else,
		'endif'   => \&Endif,
		'error'   => \&Error,
		'if'      => \&If,
		'ifdef'   => \&Ifdef,
		'ifndef'  => \&Ifndef,
		'include' => \&Include,
		'pragma'  => \&Pragma,
		'undef'   => \&Undef,
		'warning' => \&Warning
		);

# set of functions which process the file in the Parse routine.
# Processors are functions which take in a line and return the processed line.
# Note: this is done as a string rather than pointer to a function because
# it makes list easier to modify/remove from/print.
my @PIDs = ( 0 , 1 );
my $next_pid = 2; # unique processor id - first one allocated
my %Processors = (
		  '0' => "Filepp::ParseKeywords",
		  '1' => "Filepp::ReplaceDefines"
		  );
# processor types say what the processor should be run on: choice is:
# 0: Everything (default)
# 1: Full lines only (lines originating from Parse function)
# 2: Part lines only (lines originating from within keywords, eg:
# #if "condition", "condition" is a part line)
my %ProcessorTypes = (
		      '0' => 1,
		      '1' => 0
		      );

# functions to run each time a new base input file is opened or closed
my @OpenInputFuncs = ();
my @CloseInputFuncs = ();

# functions to run each time a new output file is opened or closed
my @OpenOutputFuncs = ();
my @CloseOutputFuncs = ();

# safe mode is for the paranoid, when enabled turns off #pragma filepp,
# enabled by default
my $safe_mode = 0;

# test for shebang mode, used for "filepp script", ie. executable file with
# "#!/usr/bin/perl /usr/local/bin/filepp" at the top
my $shebang = 1;

# allow $keywordchar, $contchar, $optlineendchar and $macroprefix 
# to be perl regexps
my $charperlre = 1;

# character(s) which prefix environment variables - defaults to shell-style '$'
my $envchar = "\$";

# boolean determining whether line continuation is implicit if there are more
# open brackets than close brackets on a line
# disabled by default
my $parselineend = \&Filepp::ParseLineEnd;

# character(s) which replace continuation char(s) - defaults to C-style nothing
my $contrepchar = "";

# character(s) which prefix keywords - defaults to C-style '#'
my $keywordchar;
if($charperlre) { $keywordchar = "\#"; }
else            { $keywordchar = "\Q#\E"; }

# character(s) which signifies continuation of a line - defaults to C-style '\'
my $contchar;
if($charperlre) { $contchar = "\\\\"; }
else            { $contchar = "\Q\\\E"; }

# character(s) which optionally signifies the end of a line - 
# defaults to empty string ''
my $optlineendchar = "";

# character(s) which prefix macros - defaults to nothing
my $macroprefix = "";

# flag to use macro prefix in keywords (on by default)
my $macroprefixinkeywords = 1;

# check if macros must occur as words when replacing, set this to '\b' if
# you prefer cpp style behaviour as default
my $bound = '';

# number of line currently being parsed (int)
my $line = 0;

# file currently being parsed
my $file = "";

# list of input files
my @Inputfiles;

# list of files to include macros from
my @Imacrofiles;

# flag to control when output is written
my $output = 1;

# name of outputfile - defaults to STDOUT
my $outputfile = "";

# overwrite mode - automatically overwrites old file with new file
my $overwrite = 0;

# overwrite conversion mode - conversion from input filename to output filename
my $overwriteconv = "";

# list of keywords which have "if" functionality
my %Ifwords = ('if',     '',
	       'ifdef',  '',
	       'ifndef', '');

# list of keywords which have "else" functionality
my %Elsewords = ('else', '',
		 'elif', '');

# list of keywords which have "endif" functionality
my %Endifwords = ('endif', '');

# current level of include files
my $include_level = -1;

# current parse level
my $parse_level = -1;

# suppress blank lines in header files (indexed by include level)
my $blanksuppopt = 0;
my @blanksupp;
# try to keep same number lines in output file as input file
my $preserveblank = 0;

# counter of recursion level for detecting recursive macros
my $recurse_level = -1;

# debugging info, 1=on, 0=off
my $debug = 0;
# send debugging info to stdout rather than stderr
my $debugstdout = 0;
# debug prefix character or string
my $debugprefix = "";
# debug postfix character or string
my $debugpostfix = "\n";

# hash of macros defined - standard ones already included
my %Defines = (
	       '__BASE_FILE__'     => "",
	       '__DATE__'          => "",
	       '__FILEPP_INPUT__'  => "Generated automatically from __BASE_FILE__ by filepp",
	       '__FILE__'          => $file,
	       '__INCLUDE_LEVEL__' => $include_level,
	       '__ISO_DATE__'      => "",
	       '__LINE__'          => $line,
	       '__NEWLINE__'       => "\n",
	       '__NULL__'          => "",
	       '__TAB__'           => "\t",
	       '__TIME__'          => "",
	       '__VERSION__'       => $VERSION
	       );
# hash of first chars in each macro
my %DefineLookup;
# length of longest and shortest define
my ($defmax, $defmin);
GenerateDefinesKeys();

# set default values for date and time
{
    # conversions of month number into letters (0-11)
    my @MonthChars = ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec');    
    #prepare standard defines
    my ($sec, $min, $hour, $mday, $mon, $year, $wday, $yday, $isbst) = 
	localtime(time());
    $year += 1900;
    $sec  = sprintf("%02d", $sec);
    $min  = sprintf("%02d", $min);
    $hour = sprintf("%02d", $hour);
    $mday = sprintf("%02d", $mday);
    $mon  = sprintf("%02d", $mon);
    Redefine("__TIME__", $hour.":".$min.":".$sec);
    Redefine("__DATE__", $MonthChars[$mon]." ".$mday." ".$year);
    $mon = sprintf("%02d", ++$mon);
    Redefine("__ISO_DATE__", $year."-".$mon."-".$mday);
}

# hash table for arguments to macros which need them
my %DefinesArgs = ();

# hash table for functions which macros should call (if any)
my %DefinesFuncs = ();

# eat-trailing-whitespace flag for each macro
my %EatTrail = ();

# list of include paths
my @IncludePaths;

# help string
my $usage = "filepp: generic file preprocessor, version ".$VERSION."
usage: filepp [options] inputfile(s)
options:
 -b\t\tsuppress blank lines from include files
 -c\t\tread input from STDIN instead of file
 -Dmacro[=defn]\tdefine macros (same as #define)
 -d\t\tprint debugging information
 -dd\t\tprint verbose debugging information
 -dl\t\tprint some (light) debugging information
 -dpre char\tprefix all debugging information with char
 -dpost char\tpostfix all debugging information with char, defaults to newline
 -ds\t\tsend debugging info to stdout rather than stderr
 -e\t\tdefine all environment variables as macros
 -ec char\tset environment variable prefix char to \"char\" (default \$)
 -ecn\t\tset environment variable prefix char to nothing (default \$)
 -h\t\tprint this help message
 -Idir\t\tdirectory to search for include files
 -imacros file\tread in macros from file, but discard rest of file
 -k\t\tturn off parsing of all keywords, just macro expansion is done
 -kc char\tset keyword prefix char to \"char\" (defaults to #)
 -lc char\tset line continuation character to \"char\" (defaults to \\)
 -lec char\tset optional keyword line end char to \"char\"
 -lr char\tset line continuation replacement character to \"char\"
 -lrn\t\tset line continuation replacement character to newline
 -m module\tload module
 -mp char\tprefix all macros with \"char\" (defaults to no prefix)
 -mpnk\t\tdo not use macro prefix char in keywords
 -Mdir\t\tdirectory to search for filepp modules
 -o output\tname of output file (defaults to stdout)
 -ov\t\toverwrite mode - output file will overwrite input file
 -ovc IN=OUT\toutput file(s) will have be input file(s) with IN conveted to OUT
 -pb\t\tpreseve blank lines in output that would normally be removed
 -s\t\trun in safe mode (turns off pragma keyword)
 -re\t\ttreat keyword and macro prefixes and line cont chars as reg exps
 -Umacro\tundefine macro
 -u\t\tundefine all predefined macros
 -v\t\tprint version and exit
 -w\t\tturn on word boundaries when replacing macros
 all other arguments are assumed to be input files
";


##############################################################################
# SetDebug - controls debugging level
##############################################################################
sub SetDebug
{
    $debug = shift;
    Debug("Debugging level set to $debug", 1);
}


##############################################################################
# Debugging info
##############################################################################
sub Debug
{
    # print nothing if not debugging
    if($debug == 0) { return; }    
    my $msg = shift;
    my $level = 1;
    # check if level has been provided
    if($#_ > -1) { $level = shift; }
    if($level <= $debug) {
	# if currently parsing a file show filename and line number
	if($file ne "" && $line > 0) {
	    $msg = $file.":".$line.": ".$msg;
	}
	# else show program name
	else { $msg = "filepp: ".$msg; }
	if($debugstdout) {
	    print(STDOUT $debugprefix.$msg.$debugpostfix);
	}
	else {
	    print(STDERR $debugprefix.$msg.$debugpostfix);
	}
    }
}


##############################################################################
# Standard error handler.
# #error msg  - print error message "msg" and exit
##############################################################################
sub Error
{
    my $msg = shift;
    # close and delete output file if created
    close(OUTPUT);
    if($outputfile ne "-") { # output is not stdout
	my $inputfile;
	my $found = 0;
	# do paranoid check to make sure we are not deleting an input file
	foreach $inputfile (@Inputfiles) {
	    if($outputfile eq $inputfile) { $found = 1; last; }
	}
	# delete output file
	if($found == 0) { unlink($outputfile); }
    }
    # print error message
    $debug = 1;
    Debug($msg, 0);
    exit(1);
}


##############################################################################
# SafeMode - turns safe mode on
##############################################################################
sub SafeMode
{
    $safe_mode = 1;
    Debug("Filepp safe mode enabled", 2);
}


##############################################################################
# CleanStart($sline) - strip leading whitespace from start of $sline.
##############################################################################
sub CleanStart
{
    my $sline = shift;
    for($sline) {
        # '^' = start of line, '\s+' means all whitespace, replace with nothing
        s/^\s+//;
    }
    return $sline;
}


##############################################################################
# Strip($sline, $char, $level) - strip $char's from start and end of $sline
# removes up to $level $char's from start and end of line, it is not an
# error if $level chars do not exist at the start or end of line
##############################################################################
sub Strip
{
    my $sline = shift;
    my $char = shift;
    my $level = shift;
    # strip leading chars from line
    $sline =~ s/\A([$char]{0,$level})//g;
    # strip trailing chars from line
    $sline =~ s/([$char]{0,$level})\Z//g;
    return $sline;
}


##############################################################################
# SetMacroPrefix $string - prefixs all macros with $string
##############################################################################
sub SetMacroPrefix
{
    $macroprefix = shift;
    # make sure prefix will not be treated as a Perl regular expression
    if(!$charperlre) {  $macroprefix = "\Q$macroprefix\E"; }
    Debug("Setting macro prefix to <".$macroprefix.">", 2);
}


##############################################################################
# SetKeywordchar $string - sets the first char(s) of each keyword to
# something other than "#"
##############################################################################
sub SetKeywordchar
{
    $keywordchar = shift;
    # make sure char will not be treated as a Perl regular expression
    if(!$charperlre) { $keywordchar = "\Q$keywordchar\E"; }
    Debug("Setting keyword prefix character to <".$keywordchar.">", 2);
}

##############################################################################
# GetKeywordchar - returns the current keywordchar
##############################################################################
sub GetKeywordchar
{
    return $keywordchar;
}


##############################################################################
# SetContchar $string - sets the line continuation char to something other
# than "\"
##############################################################################
sub SetContchar
{
    $contchar = shift;
    # make sure char will not be treated as a Perl regular expression
    if(!$charperlre) { $contchar = "\Q$contchar\E"; }
    Debug("Setting line continuation character to <".$contchar.">", 2);
}


##############################################################################
# SetContrepchar $string - sets the replace of the line continuation char to
# something other than ""
##############################################################################
sub SetContrepchar
{
    $contrepchar = shift;
    Debug("Setting line continuation replacement character to <".$contrepchar.">", 2);
}


##############################################################################
# SetOptLineEndchar $string - sets the optional line end char to something
# other than ""
##############################################################################
sub SetOptLineEndchar
{
    $optlineendchar = shift;
    # make sure char will not be treated as a Perl regular expression
    if(!$charperlre) { $optlineendchar = "\Q$optlineendchar\E"; }
    Debug("Setting optional line end character to <".$optlineendchar.">", 2);
}


##############################################################################
# SetEnvchar $string - sets the first char(s) of each defined environment
# variable to $string - NOTE: change only takes effect when DefineEnv run
##############################################################################
sub SetEnvchar
{
    $envchar = shift;
    Debug("Setting environment variable prefix character to <".$envchar.">",2);
}

my $stack = -1;
my @LineBuffer = ();
##############################################################################
# Process a line and put output in buffer - buffer written in Parse
##############################################################################
sub ProcessLine
{
    my $line = shift;
    # unless blank lines are suppressed at this include level
    unless($blanksupp[$include_level] && /^\s*$/) {
	# run processing chain (defaults to ReplaceDefines)
	$LineBuffer[$stack] .= RunProcessors($line, 3);
    }
}


##############################################################################
# RunProcessors $string, $calledfrom
# run the current processing chain on the string
# $string is the string to be processed and should be returned by the processor
# $calledfrom says where the processors are called from, the choice is:
#
# 0 or default: Part line (from within a keyword) - if called recursively
# runs all processors AFTER current processor, then continues with processing.
# This is used when a keyword wants to run all remaining processors on a line
# before doing its keyword task.
# 
# 1: Full line (from Parse function) - if called recursively runs all
# processors BEFORE current processor, then continues with processing
# 
# 2:  Part line (from within a keyword) - if called recursively runs all
# processors BEFORE current processor, then continues with processing.
# This is used when keywords are using text taken from somewhere other than
# the current line,  this text needs to go through the same processors as
# the current line has been through so it can "catch up" (eg: regexp.pm).
#
# 3: Full line - run all processors before and including this one
#
##############################################################################
my @Stack; # list of processors currently running at each level of stack
my @PID; # id of processor running at this level of stack
my @Level; # parse level for current stack
sub RunProcessors
{
    my $string = shift;
    my $calledfrom = 0;
    if($#_ > -1) { $calledfrom = shift; }
    my $i;

    # increment stack
    $stack++;
    $Level[$stack] = $parse_level;
    $LineBuffer[$stack] = "";

    # turn off macoprefix if in a keyword
    my $tmpprefix = "";
    if($calledfrom != 1 && $macroprefixinkeywords == 0) {
	$tmpprefix = $macroprefix;
	$macroprefix = "";
    }
    
    # make local copy of processor list, this allows processors to
    # add/delete other processors without affecting current processing run
    my @myPIDs= @PIDs;
    $Stack[$stack] = \@myPIDs;
    
    # These tests are done to make RunProcessors recursion safe.
    # If RunProcessors is called from within a function that was itself called
    # by RunProcessors, then the second calling of RunProcessors will only
    # execute the processors before the currently running processor in the
    # chain
    my $recursing = 0;
    my $run_procs = "all";
    if($stack > 0 && $Level[$stack] == $Level[$stack - 1]) {
	if($calledfrom == 0) { $run_procs = "after"; }
	else { $run_procs = "before"; }
	if($calledfrom == 3) {
	    $run_procs = "all";
	    $calledfrom = 1;
	}
    }
    # initial state
    my $state = "before";

    my $pid;
    foreach $pid (@{$Stack[$stack]}) {
	$PID[$stack] = $pid;
	
	# flag to say if before or after processor called from
	if($stack > 0 && $Level[$stack] == $Level[$stack - 1]) {
	    if($pid == $PID[$stack - 1]) { $state = "this";  }
	    elsif($state eq "this")      { $state = "after"; }
	}
	
	# run if running all or before/after current processor in prev chain
	if($run_procs eq "all" || $run_procs eq $state) {

	    # called from anywhere (default)
	    if($ProcessorTypes{$pid} == 0 ||

	       # called from keyword (part lines only - within keywords)
	       (($calledfrom == 0 || $calledfrom == 2) &&
		$ProcessorTypes{$pid} == 2) ||

	       # called from Parse function (whole lines only)
	       ($calledfrom == 1 && $ProcessorTypes{$pid} == 1)) {

		# run processor
		Debug("Running processor ".$Processors{$pid}."[".$parse_level.
		      "][".$stack."][".$pid."] on \"".$string."\"", 3);
		$string = $Processors{$pid}->($string);
	    }
	} 
    }
    
    # return macro prefix to its former glory
    if($calledfrom != 1 && $macroprefixinkeywords == 0) {
	$macroprefix = $tmpprefix;
    }
	
    # check for anything in $line_buffer
    if($LineBuffer[$stack] ne "") {
	$string .= $LineBuffer[$stack];
	$LineBuffer[$stack] = "";
    }
    
    # decrease place on stack
    $stack--;
    
    return $string;
}

##############################################################################
# PrintProcessors
# print the current processing chain
##############################################################################
sub PrintProcessors
{
    my @PrintPIDs = @PIDs;
    if($#_ > -1) { @PrintPIDs = @_; }
    my $pid;
    Debug("Current processing chain:", 3);
    my $i = 0;
    foreach $pid (@PrintPIDs) {
	Debug($Processors{$pid}."[".$pid."] type ".$ProcessorTypes{$pid}, 3);
	$i++;
    }
}

##############################################################################
# AddProcessor(function[, first[, type]])
# add a line processor to processing chain, defaults to end of chain
# if "first" is set to one adds processor to start of chain
##############################################################################
sub AddProcessor
{
    my $function = shift;
    my $first = 0;
    my $type = 0;
    my $my_pid = $next_pid++;
    # check if flag to add processor to start of chain is set
    if($#_ > -1) { $first = shift; }
    # check if processor has a type
    if($#_ > -1) { $type = shift; }
    # adding processor to start of chasin
    if($first) {
	@PIDs = reverse(@PIDs);
    }
    push(@PIDs, $my_pid);
    $Processors{$my_pid} = $function;
    if($first) {
	@PIDs = reverse(@PIDs);
    }
    $ProcessorTypes{$my_pid} = $type;
    Debug("Added processor ".$function." of type ".$type, 2);
    if($debug > 1) { PrintProcessors(); }
}

##############################################################################
# AddProcessorAfter(function, processor[, type])
# add a line processor to processing chain immediately after an existing
# processor, if existing processor not found, new processor is added to
# end of chain
##############################################################################
sub AddProcessorAfter
{
    my $function = shift;
    my $existing = shift;
    my $type = 0;
    # check if processor has a type
    if($#_ > -1) { $type = shift; }
    my $i = 0;
    my $found = 0;
    my @CurrentPIDs = @PIDs;
    my $pid;
    my $my_pid = $next_pid++;
    # reset processing chain
    @PIDs = ();
    foreach $pid (@CurrentPIDs) {
	push(@PIDs, $pid);
	if(!$found) {
	    # check done as regular expression for greater flexibility
	    if($Processors{$pid} =~ /$existing/) {
		push(@PIDs, $my_pid);
		$Processors{$my_pid} = $function;
		$found = 1;
	    }
	}
    }
    if(!$found) {
	Warning("Did not find processor $existing in chain, processor $function added to end of list");
	AddProcessor($function, 0, $type);
	return;
    }
    $ProcessorTypes{$my_pid} = $type;
    Debug("Added processor ".$function." of type ".$type, 2);
    if($debug > 1) { PrintProcessors(); }
}

##############################################################################
# AddProcessorBefore(function, processor[, type])
# add a line processor to processing chain immediately after an existing
# processor, if existing processor not found, new processor is added to
# end of chain
##############################################################################
sub AddProcessorBefore
{
    my $function = shift;
    my $existing = shift;
    my $type = 0;
    # check if processor has a type
    if($#_ > -1) { $type = shift; }
    my $i = 0;
    my $found = 0;
    my @CurrentPIDs = @PIDs;
    my $pid;
    my $my_pid = $next_pid++;
    # reset processing chain
    @PIDs = ();
    foreach $pid (@CurrentPIDs) {
	if(!$found) {
	    # check done as regular expression for greater flexibility
	    if($Processors{$pid} =~ /$existing/) {
		push(@PIDs, $my_pid);
		$Processors{$my_pid} = $function;
		$found = 1;
	    }
	}
	push(@PIDs, $pid);
    }
    if(!$found) {
	Warning("Did not find processor $existing in chain, processor $function added to start of list");
	AddProcessor($function, 1, $type);
	return;
    }
    $ProcessorTypes{$my_pid} = $type;
    Debug("Added processor ".$function." of type ".$type, 2);
    if($debug > 1) { PrintProcessors(); }
}

##############################################################################
# RemoveProcessor(function)
# remove a processor name "function" from list
##############################################################################
sub RemoveProcessor
{
    my $function = shift;    
    my $i = 0;
    # find function
    while($i <= $#PIDs && $Processors{$PIDs[$i]} ne $function) { $i++; }
    # check function found
    if($i > $#PIDs) {
	Warning("Attempt to remove function ".$function.
		" which does not exist");
	return;
    }
    # remove function
    my $pid = $PIDs[$i];
# cannot delete functions yet, as we may still be in a processing
# chain that uses them later
#    delete($Processors{$pid});
#    delete($ProcessorTypes{$pid});
    for(; $i<$#PIDs; $i++) {
	$PIDs[$i] = $PIDs[$i+1];
    }
    pop(@PIDs);
    Debug("Removed processor ".$function."[".$pid."]", 2);
    PrintProcessors();
}


##############################################################################
# Add a function to run each time a base file is opened
##############################################################################
sub AddOpenInputFunc
{
    my $func = shift;
    push(@OpenInputFuncs, $func);
}

##############################################################################
# Add a function to run each time a base file is closed
##############################################################################
sub AddCloseInputFunc
{
    my $func = shift;
    push(@CloseInputFuncs, $func);
}

##############################################################################
# Add a function to run each time a base file is opened
##############################################################################
sub AddOpenOutputFunc
{
    my $func = shift;
    push(@OpenOutputFuncs, $func);
}

##############################################################################
# Add a function to run each time a base file is closed
##############################################################################
sub AddCloseOutputFunc
{
    my $func = shift;
    push(@CloseOutputFuncs, $func);
}


##############################################################################
# AddKeyword(keyword, function)
# Define a new keyword, when keyword (preceded by keyword char) is found,
# function is run on the remainder of the line.
##############################################################################
sub AddKeyword
{
    my $keyword = shift;
    my $function = shift;    
    $Keywords{$keyword} = $function;
    Debug("Added keyword ".$keyword." which runs ".$function, 2);
}


##############################################################################
# RemoveKeyword(keyword)
# Keyword is deleted from list, all occurrences of keyword found in
# document are ignored.
##############################################################################
sub RemoveKeyword
{
    my $keyword = shift;
    delete $Keywords{$keyword};
    # sort keywords index into reverse order, this ensures #if[n]def comes
    # before #if when comparing input with keywords
    Debug("Removed keyword ".$keyword, 2);
}


##############################################################################
# RemoveAllKeywords - removes all current keywords.
##############################################################################
sub RemoveAllKeywords
{
    %Keywords = ();
    Debug("Removed all current keywords", 2);
}


##############################################################################
# AddIfword - adds a keyword to ifword hash
##############################################################################
sub AddIfword
{
    my $ifword = shift;
    $Ifwords{$ifword} = '';
    Debug("Added Ifword: ".$ifword, 2);
}

##############################################################################
# RemoveIfword - removes a keyword from ifword hash
##############################################################################
sub RemoveIfword
{
    my $ifword = shift;
    delete $Ifwords{$ifword};
    Debug("Removed Ifword: ".$ifword, 2);
}

##############################################################################
# AddElseword - adds a keyword to elseword hash
##############################################################################
sub AddElseword
{
    my $elseword = shift;
    $Elsewords{$elseword} = '';
    Debug("Added Elseword: ".$elseword, 2);
}

##############################################################################
# RemoveElseword - removes a keyword from elseword hash
##############################################################################
sub RemoveElseword
{
    my $elseword = shift;
    delete $Elsewords{$elseword};
    Debug("Removed Elseword: ".$elseword, 2);
}

##############################################################################
# AddEndifword - adds a keyword to endifword hash
##############################################################################
sub AddEndifword
{
    my $endifword = shift;
    $Endifwords{$endifword} = '';
    Debug("Added Endifword: ".$endifword, 2);
}

##############################################################################
# RemoveEndifword - removes a keyword from endifword hash
##############################################################################
sub RemoveEndifword
{
    my $endifword = shift;
    delete $Endifwords{$endifword};
    Debug("Removed Endifword: ".$endifword, 2);
}


##############################################################################
# AddIncludePath - adds another include path to the list
##############################################################################
sub AddIncludePath
{
    my $path = shift;
    push(@IncludePaths, $path);
    Debug("Added include path: \"".$path."\"", 2);
}


##############################################################################
# AddModulePath - adds another module search path to the list
##############################################################################
sub AddModulePath
{
    my $path = shift;
    # add new path to start of list
    @INC = reverse(@INC);
    push(@INC, $path);
    @INC = reverse(@INC);
    Debug("Added module path: \"".$path."\"", 2);
}


# set if file being written to has same name as input file
my $same_file = "";

##############################################################################
# OpenOutputFile - opens the output file
##############################################################################
sub OpenOutputFile
{
    $outputfile = shift;
    Debug("Output file: ".$outputfile, 1);
    
    # check for outputfile name, if not specified use STDOUT
    if($outputfile eq "") { $outputfile = "-"; }
    
    # output is not stdout and file with that name already exists
    if($outputfile ne "-" && FileExists($outputfile) ) {
	$same_file = $outputfile;
	# paranoid: check file is writable and normal file
	if(-w $outputfile && -f $outputfile) {
	    $outputfile = $outputfile.".fpp".$$;
	    my $i=0; # paranoid: check temp file does not exist
	    while(FileExists($outputfile)) {
		$outputfile = $outputfile.$i;
		$i++;
		if($i >= 10) { Error("Cound not get temp filename"); }
	    }
	}
	else {
	    Error("Cannot read or write to ".$outputfile);
	}
    }
    if(!open(OUTPUT, ">".$outputfile)) {
	Error("Cannot open output file: ".$outputfile);
    }
    # run any open functions
    my $func;
    foreach $func (@OpenOutputFuncs) { $func->(); }
}


##############################################################################
# CloseOutputFile - close the output file
##############################################################################
sub CloseOutputFile
{
    # run any close functions
    my $func;
    foreach $func (@CloseOutputFuncs) { $func->(); }
    close(OUTPUT);
    
    # if input and output have same name, rename output to input now
    if($same_file ne "") {
	if(rename($same_file, $same_file."~") == -1) {
	    Error("Could not rename ".$same_file." ".$same_file."~");
	}
	if(rename($outputfile, $same_file) == -1) {
	    Error("Could not rename ".$outputfile." ".$same_file);
	}
    }
    # reset same_file
    $same_file = "";
}


##############################################################################
# ChangeOutputFile - change the output file
##############################################################################
sub ChangeOutputFile
{
    CloseOutputFile();
    $outputfile = shift;
    OpenOutputFile($outputfile);
}


##############################################################################
# AddInputFile - adds another input file to the list
##############################################################################
sub AddInputFile
{
    my $file = shift;
    push(@Inputfiles, $file);
    Debug("Added input file: \"".$file."\"", 2);
}


##############################################################################
# UseModule(module)
# Module "module.pm" is used, "module.pm" can be any perl module and can use
# or replace any of the functions in this package
##############################################################################
sub UseModule
{
    my $module = shift;
    Debug("Loading module ".$module, 1);
    require $module; 
    if($@) { Error($@); }
}


##############################################################################
# find end of next word in $sline, assumes leading whitespace removed
##############################################################################
sub GetNextWordEnd
{
    my $sline = shift;
    # check for whitespace in this string
    if($sline =~ /\s/) {
	# return length of everything up to first whitespace
	return length($`);
    }
    # whitespace not found, return length of the whole string
    return length($sline);
}


##############################################################################
# Print current table of defines - used for debugging
##############################################################################
sub PrintDefines
{
    my $define;
    Debug("Current ".$keywordchar."define's:", 3);
    foreach $define (keys(%Defines)) {
        Debug(" macro:\"".$define."\", definition:\"".$Defines{$define}."\"",3);
    }
}


##############################################################################
# DefineEnv - define's all environment variables to macros, each prefixed
# by $envchar
##############################################################################
sub DefineEnv
{
    my $macro;
    Debug("Defining environment variables as macros", 2);
    foreach $macro (keys(%ENV)) {
	Define($envchar.$macro." ".$ENV{$macro});
    }
}


##############################################################################
# Find out if arguments have been used with macro
##############################################################################
sub DefineArgsUsed
{
    my $string = shift;
    # check '(' is first non-whitespace char after macro
    if($string =~ /^\s*\(/) { 
	return 1;
    }
    return 0;
}


##############################################################################
# ParseArgs($string) -  find the arguments in a string of form
# (arg1, arg2, arg3...) trailing chars
# or
# arg1, arg2, arg3...
##############################################################################
sub ParseArgs
{
    my $string = shift;
    $string = CleanStart($string);
    my @Chars;
    my $char;
    # split string into chars (can't use split coz it deletes \n at end)
    for($char=0; $char<length($string); $char++) {
	push(@Chars, substr($string, $char, 1));
    }
    my @Args;    # list of Args
    my $arg = "";
    my @Endchar;
    # special characters - no processing is done between character pairs
    my %SpecialChars = ('(' => ')', '"' => '"', '\'' => '\'');	
    my $s = -1;  # start of chars
    my $backslash = 0;
    # number of special char pairs to allow
    my $pairs = 1;
    
    # deal with first '(' if there (ie func(args) rather than func args)
    if($#Chars >= 0 && $Chars[0] eq '(') {
	push(@Endchar, ')');
	$Chars[0] = '';
	$s++;
	$pairs++; # ignore this pair of special char pairs
    }

    # replace args with their values
	my $bracketCount = 0;
    foreach $char (@Chars) {
## Modification by Juerg Lehni: Detect nested {} pairs
	if($char eq '{') {
		$bracketCount++;
	} elsif ($char eq '}') {
		$bracketCount--;
	}
	if($bracketCount > 0) {
		# do nothing
	}
	# deal with end of special chars, ),",' etc.
	elsif($#Endchar > -1 && $char eq $Endchar[$#Endchar])  {
## Modification end
	    # if char before this was a backslash, ignore this char
	    if($backslash) {
		chop($arg); # delete backslash from string
	    }
	    else {
		# pop end char of list and reduce pairs if its a bracket
		if(pop(@Endchar) eq ')') { $pairs--; }
	    }
	}
	# deal with start of special chars
	elsif(exists($SpecialChars{$char}))  {
	    # if char before this was a backslash, ignore this char
	    if($backslash) {
		chop($arg); # delete backslash from string
	    }
	    # only start new pair if not already in special char pair
	    # (not including main args brackets of course)
	    elsif($#Endchar < $pairs-1) {
		push(@Endchar, $SpecialChars{$char});
		# need to treat brackets differently for macros within
		# macros "this(that(tother)))", otherwise lose track of ()'s
		if($char eq '(') { $pairs++; }
	    }
	}
	# deal with ',', add arg to list and start search for next one
	elsif($#Endchar == $s && $char eq ',') {
	    # if char before this was a backslash, ignore this char
	    if($backslash) {
		chop($arg); # delete backslash from string
	    }
	    else {
		push(@Args, CleanStart($arg));
		$char = '';
		$arg = "";
		next;
	    }
	}
	# deal \\ with an escaping \ ie. \" or \, or \\
	if($char eq '\\') {
	    if($backslash) { # found \\
		$backslash = 0; # second backslash ignored
		chop($arg); # delete backslash from string
	    }
	    else{$backslash = 1;}
	}
	elsif($backslash) { $backslash = 0; }
	# check for end of args string
	if($#Endchar < $s) {
	    push(@Args, CleanStart($arg));
	    $char = '';
	    # put remainder of string back together
	    $arg = join('', @Chars);
	    last;
	}
	$arg = $arg.$char; # add char to current arg
	$char = '';        # set char to null
    }
    
    # deal with last arg or string following args if it exists
    push(@Args, $arg);
    
    return @Args;
}


##############################################################################
# Find the arguments in a macro and replace them
##############################################################################
sub FindDefineArgs
{
    my $substring = shift;
    my $macro = shift;

## Modification by Juerg Lehni:
## Dected multiline code blocks as parameters to macros.
    use Text::Balanced qw(extract_bracketed);
    my ($extracted, $remainder);
    while(1) {
        ($extracted, $remainder) = extract_bracketed($substring, '(){}[]');
        if($extracted) { last; }
        #if nothing could be extracted, use more lines.
        $substring .= GetNextLine();
    }
## Modification end

    # get definition list for this macro
    my @Argnames = split(/\,/, $DefinesArgs{$macro});

    # check to see if macro can have any number of arguments (last arg ...)
    my $anyargs = ($#Argnames >= 0 && $Argnames[$#Argnames] =~ /\.\.\.\Z/o);
    
    # get arguments passed to this macro
    my @Argvals = ParseArgs($substring);
    # everything following macro args should be returned as tail
    my $tail = pop(@Argvals);

    # check the right number of args have been passed, should be all args 
    # present plus string at end of args (assuming macro cannot have any number
    # of arguments)
    if(!$anyargs && $#Argvals != $#Argnames) {
	# show warning if wrong args (unless macro should have zero args and
	# 1 arg provided which is blank space
	if(!($#Argnames == -1 && $#Argvals == 0 && $Argvals[0] =~ /\A\s*\Z/)) {
	    Warning("Macro \'".$macro."\' used with ".($#Argvals+1).
		    " args, expected ".($#Argnames+1));
	}
	# delete all excess args
	while($#Argvals > $#Argnames) { pop(@Argvals); }
    }
    # make all missing args blanks
    while($#Argvals < $#Argnames) { push(@Argvals, ""); }
        
    return (@Argvals, $tail);
}


##############################################################################
# FunctionMacro: used with functions to inform a module which macro
# was being replaced when the function was called - used in bigfunc.pm
##############################################################################
my $functionmacro = "";
sub FunctionMacro
{
    return $functionmacro;
}


##############################################################################
# Replace all defined macro's arguments with their values
# Inputs:
# $macro  = the macro to be replaces
# $string = the string following the occurrence of macro
##############################################################################
sub ReplaceDefineArgs
{
    my ($string, $tail, %Used) = @_;
    # check if args used, if not do nothing
    if(DefineArgsUsed($tail)) {
	my $macro = $string;
	# get arguments following macro
	my @Argvals = FindDefineArgs($tail, $macro);
	$tail = pop(@Argvals); # tail returned as last element
	
	my @Argnames = split(/\,/, $DefinesArgs{$macro});
	my $i;
	
	# replace previous macro with defn + args
	$string = $Defines{$macro};
			
	# check if macro should call a function
	if(exists($DefinesFuncs{$macro})) {
	    # replace all macros in argument list
	    for($i=0; $i<=$#Argvals; $i++) {
		$Argvals[$i] = ReplaceDefines($Argvals[$i]);
	    }
	    if($debug > 1) {
		my $argstring = "";
		if($#Argvals >= 0) { $argstring = join(", ", @Argvals); }
		Debug("Running function $DefinesFuncs{$macro} with args (".
		      $argstring.")", 2);
	    }
	    # set name of macro which is being parse (needed in bigfunc.pm)
	    $functionmacro = $macro;
	    $string = $DefinesFuncs{$macro}->(@Argvals);
	    # don't need do anything else, return now
	    return $string, $tail;
	}
	
	# call function that does the real work
	($string, $tail) = ArgReplacer(\@Argvals, \@Argnames,
				       $macro, $string, $tail, %Used);
	
    }
    else {
	Debug("Macro \"".$string."\" found without args, ignored", 2); 
    }
    return ($string, $tail);
}
	


##############################################################################
# 
##############################################################################
sub ArgReplacer
{
    my ($argvals, $argnames, $macro, $string, $tail, %Used) = @_;
    my @Argvals = @{$argvals};
    my @Argnames = @{$argnames};
    my ($i, $j);
    
    # check if last arg ends in ... (allows any number of args in macro)
    if($#Argnames >= 0 && $Argnames[$#Argnames] =~ s/\.\.\.\Z//o) {
	# concatanate all extra args into final arg
	while($#Argvals > $#Argnames) {
	    my $arg1 = pop(@Argvals);
	    my $arg2 = pop(@Argvals);
	    push(@Argvals, $arg2.", ".$arg1);
	}
	# check for ## at start of macro name in args list
	if($string =~ /\#\#$Argnames[$#Argnames]/) {
	    # if last argument is empty remove preciding ","
	    if($#Argvals == $#Argnames && $Argvals[$#Argnames] eq "") {
		$string =~ s/\,\s*\#\#$Argnames[$#Argnames]//g;
	    }
	    else {
		$string =~
		    s/\#\#$Argnames[$#Argnames]/$Argnames[$#Argnames]/g;
	    }
	}
    }
    
    # if %Used is empty, then assume all macros have been replaced already,
    # nasty hack for when called from bigfunc
    if(keys(%Used) == 0) {
	%Used = %Defines;
    }

    # to get args passed to macro to same processed level as rest of
    # macro, they need to be checked for occurrences of all used macros,
    # this is a nasty hack to temporarily change defines list to %Used
    {      
	my %RealDefines = %Defines;
	my $realdefmin = $defmin;
	my $realdefmax = $defmax;
	my %RealDefineLookup = %DefineLookup;
	%Defines = %Used;
	GenerateDefinesKeys();	    
	
	for($i=0; $i<=$#Argvals; $i++) {
	    $Argvals[$i] = ReplaceDefines($Argvals[$i]);
	}
	
	# return defines to normal
	%Defines = %RealDefines;
	$defmin = $realdefmin;
	$defmax = $realdefmax;
	%DefineLookup = %RealDefineLookup;
    }
    
    # The next step replaces argnames with argvals.  Once a bit of string
    # has been replaced it is removed from further processing to avoid
    # unwanted recursive macro replacement.
    my @InString = ( $string ); # string to be replaced
    my @InDone   = ( 0 );       # flag to say if string section replaced
    my @OutString;              # output of string sections after each
    # macro has been replaced
    my @OutDone;                # output flags
    my $k = 0;
    for($i=0; $i<=$#Argnames; $i++) {
	for($j=0; $j<=$#InString; $j++) {
	    if($InDone[$j] == 0) {
		# replace macros and split up string so replaced part
		# is flagged as done and rest is left for further
		# processing
		while($InString[$j] =~ /$bound$Argnames[$i]$bound/) {
		    $OutString[$k] = $`;            $OutDone[$k] = 0;
		    $k++;
		    $OutString[$k] = $Argvals[$i];  $OutDone[$k] = 1;
		    $k++;
		    $InString[$j] = $';     # one more quote for emacs '
		}
	    }
	    $OutString[$k] = $InString[$j];   $OutDone[$k] = $InDone[$j];
	    $k++;
	}
	@InString = @OutString;   @InDone = @OutDone;
	$k = 0;
    }
    # rebuild string
    $string = join('', @InString);
    
    Debug("Replaced \"".$macro."\" for \"".$string."\" [".$recurse_level."]", 2);
    return ($string, $tail);
}


##############################################################################
# When replacing macros with args, the macro and everything following the
# macro (the tail) are passed to ReplaceDefineArgs.  The function extracts
# the args from the tail and then returns the replaced macro and the new
# tail.  This function extracts the remaining part of the real tail from 
# the current input string.
##############################################################################
sub ReclaimTail
{
    my ($input, $tail) = @_;
    # split strings into chars and compare each one until difference found
    my @Input = split(//, $input);
    my @Tail  = split(//, $tail);
    $tail = $input = "";
    while($#Input >= 0 && $#Tail >= 0 && $Input[$#Input] eq $Tail[$#Tail]) {
	$tail = pop(@Tail).$tail;
	pop(@Input);
    }
    while($#Input >=0) { $input = pop(@Input).$input; }
    return ($input, $tail);
}


##############################################################################
# Replace all defined macro's in a line with their value.  Recursively run 
# through macros as many times as needed (to find macros within macros).
# Inputs:
# $input = string to process
# $tail  = rest of line following $string (if any), this will only be used
#          if string contains a macro with args, the args will probably be
#          at the start of the tail
# %Used  = all macros found in $string so far, these will not be checked
#          again to avoid possible recursion
# Initially just $input is passed in, other args are added for recursive calls
##############################################################################
sub ReplaceDefines
{
    my ($input, $tail, %Used) = @_;    
    # check for recursive macro madness (set to same level as Perl warning)
    if(++$recurse_level > 97) {
	$recurse_level--;
	Warning("Recursive macro detected in \"".$input."\""); 
	if($tail) { return ($input, $tail); } 
	return $input;
    }
    
    my $out = "";   # initialise output to empty string
    OUTER : while($input =~ /\S/o) {
	my ($macro, $string);
	my @Words;


        ######################################################################
	# if macros start with prefix, skip to next prefix
        ######################################################################
	if($macroprefix ne "") {
	    my $found = 0;
	    # find next potential macro in line if any	    
	    while(!$found && $input =~ /$macroprefix\S/) {
		# everything before prefix
		$out = $out.$`;
		# reclaim first char in macro
		my $match = $&;
		# everything after prefix
		$input = chop($match).$';  # one more quote for emacs '
		# check if first chars are in macro
		if(exists($DefineLookup{substr($input, 0, $defmin)})) {
		    $found = 1;
		}
		# put prefix back onto output and carry on searching
		else { $out = $out.$match; }
	    }
	    # no more macros
	    if(!$found) { $out = $out.$input; $input = ""; last OUTER; }
	}


        ######################################################################
	# replacing macros which are "words" only - quick and easy
        ######################################################################
	if($bound eq '\b') {
	    @Words = split(/(\w+)/, $input, 2);
	    $out =  $out.$Words[0];
	    if($#Words == 2) { $macro = $Words[1]; $input = $Words[2]; }
	    else             { $input = ""; last OUTER; }
	}

        ######################################################################
	# replacing all types of macro - slow and horrid
        ######################################################################
	else {
	    # forward string to next non-whitespace char that starts a macro
	    while(!exists($DefineLookup{substr($input, 0, $defmin)})) {
		if($input =~ /^\s/ ) { # remove preceding whitespace
		    @Words = split(/^(\s+)/, $input, 2);
		    $out = $out.$Words[1];
		    $input = $Words[2]; 
		}
		else { # skip to next char
		    $out = $out.substr($input, 0, 1);
		    $input = substr($input, 1);
		}
		if($input eq "") { last OUTER; }
	    }
	    # remove the longest possible potential macro (containing no 
	    # whitespace) from the start of input
	    @Words = split(/(\s+)/, $input, 2);
	    $macro = $Words[0];
	    if($#Words == 2) {$input = $Words[1].$Words[2]; }
	    else             {$input = ""; }
	    # shorten macro if too long
	    if(length($macro) > $defmax) {
		$input = substr($macro, $defmax).$input;
		$macro = substr($macro, 0, $defmax);
	    }
	    # see if a macro exists in "macro"
	    while(length($macro) > $defmin &&
		  !(exists($Defines{$macro}) && !exists($Used{$macro}))) {
		# chop a char off macro and try again
		$input = chop($macro).$input;
	    }
	}

	# check if macro is at start of string and has not been used yet
	if(exists($Defines{$macro}) && !exists($Used{$macro})) {
	    # set macro as used
	    $Used{$macro} = $Defines{$macro};
	    # temporarily add tail to input
	    if($tail) { $input = $input.$tail; }
	    # replace macro with defn
	    if(CheckDefineArgs($macro)) {
		($string, $input) = ReplaceDefineArgs($macro, $input, %Used);
	    }
	    else { 
		$string = $Defines{$macro};		
		Debug("Replaced \"".$macro."\" for \"".$string."\" [".$recurse_level."]", 2);
	    }

# FIXME - what is this line for???????
	    ($string=~ m/\#\#/) and ($string=~ s/\s*\#\#\s*//gm);

	    @Words = ReplaceDefines($string, $input, %Used);
	    $out = $out.$Words[0];
	    if($#Words == 0) { $input = ""; }
	    else {
		# remove space up to start of next char
		if(CheckEatTrail($macro)) { $Words[1] =~ s/^[ \t]*//o; }
		$input = $Words[1];
	    }
	    delete($Used{$macro});
	    # reclaim all unparsed tail
	    if($tail && $tail ne "") {
		($input, $tail) = ReclaimTail($input, $tail);
	    }
	}
	# macro not matched, add to output and move swiftly on
	else { 
	    if($bound eq '\b') { $out = $out.$macro; }
	    else { 
		$out = $out.substr($macro, 0, 1);
		$input = substr($macro, 1).$input;
	    }
	}
    }
    $recurse_level--;
    # append any whitespace left in string and return it
    if($tail) { return ($out.$input, $tail); }
    return $out.$input;
}


##############################################################################
# GenerateDefinesKey creates all keys and indices needed for %Defines
##############################################################################
sub GenerateDefinesKeys
{
    # find longest and shortest macro
    my ($define, $length) = each %Defines;
    $defmin = $defmax = length($define);
    %DefineLookup = ();
    foreach $define (keys(%Defines)) {
	$length = length($define);
	if($length > $defmax) { $defmax = $length; }
	if($length < $defmin) { $defmin = $length; }
    }
    # regenerate lookup table of first letters
    foreach $define (keys(%Defines)) {
	$DefineLookup{substr($define, 0, $defmin)} = 1;
    }
}


##############################################################################
# Set a define
##############################################################################
sub SetDefine
{
    my ($macro, $value) = @_;
    # add macro and value to hash table
    $Defines{$macro} = $value;
    # add define to keys
    my $length = length($macro);
    if($length < $defmin || $defmin == 0) { GenerateDefinesKeys(); }
    else {
	if($length > $defmax) { $defmax = $length; }
	$length = substr($macro, 0, $defmin);
	$DefineLookup{$length} = 1;
    }
}


##############################################################################
# Get a define without doing any macro replacement
# also returns list of args to macro if it has any
##############################################################################
sub GetDefine
{
    my $macro = shift;
    if(exists($DefinesArgs{$macro})) {
	return ($Defines{$macro}, $DefinesArgs{$macro});
    }
    return $Defines{$macro};
}


##############################################################################
# Replace a define, checks if macro defined and only redefine's if it is
##############################################################################
sub Redefine
{
    my $macro = shift;
    my $value = shift;
    # check if defined
    if(CheckDefine($macro)) { SetDefine($macro, $value); }
}


##############################################################################
# Set a define argument list
##############################################################################
sub SetDefineArgs
{
    my $macro = shift;
    my $args = shift;
    # add macro args to hash table
    $DefinesArgs{$macro} = $args;
}


##############################################################################
# Set a function which should be called when a macro is found
##############################################################################
sub SetDefineFuncs
{
    my $macro = shift;
    my $func = shift;
    # add macro function to hash table
    $DefinesFuncs{$macro} = $func;
}


##############################################################################
# Check if a macro is defined
##############################################################################
sub CheckDefine
{
    my $macro = shift;
    return exists($Defines{$macro});
}


##############################################################################
# Check if a macro is defined and has arguments
##############################################################################
sub CheckDefineArgs
{
    my $macro = shift;
    return exists($DefinesArgs{$macro});
}


##############################################################################
# Check if a macro is defined and calls a function
##############################################################################
sub CheckDefineFuncs
{
    my $macro = shift;
    return exists($DefinesFuncs{$macro});
}


##############################################################################
# Check if a macro is defined and eats trailing whitespace
##############################################################################
sub CheckEatTrail
{
    my $macro = shift;
    return exists($EatTrail{$macro});
}


##############################################################################
# Set eat-trailing-whitespace for a macro
##############################################################################
sub SetEatTrail
{
    my $macro = shift;
    $EatTrail{$macro} = 1;
}


##############################################################################
# Test if a file exists and is readable
##############################################################################
sub FileExists
{
    my $filename = shift;
    # test if file is readable and not a directory
    if( !(-r $filename) || -d $filename ) {
	Debug("Checking for file: ".$filename."...not found!", 2);
	return 0;
    }
    Debug("Checking for file: ".$filename."...found!", 2);
    return 1;
}


##############################################################################
# #comment  - rest of line ignored as a comment
##############################################################################
sub Comment
{
    # nothing to be done here
    Debug("Commented line", 2);
}


##############################################################################
# Define a variable, accepted inputs:
# $macrodefn = $macro $defn - $macro associated with $defn
#              ie: #define TEST test string
#              $macro = TEST, $defn = "test string"
#              Note: $defn = rest of line after $macro
# $macrodefn = $macro - $macro defined without a defn, rest of line ignored
#              ie: #define TEST_DEFINE
#              $macro = TEST_DEFINE, $defn = "1"
##############################################################################
sub Define
{
    my $macrodefn = shift;
    my $macro;
    my $defn;
    my $i;

    # check there is an argument
    if($macrodefn !~ /\S/o) {
	Filepp::Error("define keyword used without arguments");
    }
    
    # find end of macroword - assume separated by space or tab
    $i = GetNextWordEnd($macrodefn);
    
    # separate macro and defn (can't use split, doesn't work with '0')
    $macro = substr($macrodefn, 0, $i);
    $defn  = substr($macrodefn, $i);
    
    # strip leading whitespace from $defn
    if($defn) {
	$defn =~ s/^[ \t]*//;
    }
    else {
	$defn = "";
    }
    
    # check if macro has arguments (will be a '(' in macro)
    if($macro =~ /\(/) {
	# split up macro, args and defn - delimiters = space, (, ), ','
	my @arglist = split(/([\s,\(,\),\,])/, $macro." ".$defn);
	my $macroargs = "";
	my $arg;
	
	# macro is first element in list, remove it from list
	$macro = $arglist[0];
	$arglist[0] = "";
	# loop through list until ')' and find all args
	foreach $arg (@arglist) {
	    # end of arg list, leave loop
	    if($arg eq ")") {
		$arg = "";
		last;
	    }
	    # ignore space, ',' and '('
	    elsif($arg =~ /[\s,\,,\(]/) {
		$arg = "";
	    }
	    # argument found, add to ',' separated list
	    elsif($arg ne "") {
		$macroargs = $macroargs.",".$arg;
		$arg = "";
	    }
	}
	$macroargs = Strip($macroargs, ",", 1);
	# store args
	SetDefineArgs($macro, $macroargs);
	
	Debug("Define: macro ".$macro." has args (".$macroargs.")", 2);
	# put rest of defn back together
	$defn = join('',@arglist);
	$defn = CleanStart($defn);
    }
    # make sure macro is not being redefined and used to have args
    else {
	delete($DefinesArgs{$macro});
	delete($DefinesFuncs{$macro});
    }
    
    # define the macro defn pair
    SetDefine($macro, $defn);
    
    Debug("Defined \"".$macro."\" to be \"".$defn."\"", 2);
    if($debug > 2) { PrintDefines(); }
}
   


##############################################################################
# Else, standard if[n][def]-else-endif
# usage: #else somewhere between #if[n][def] key and #endif
##############################################################################
sub Else
{
    # else always true - only ran when all preceding 'if's have failed
    return 1;
}


##############################################################################
# Endif, standard ifdef-[else]-endif
# usage: #endif somewhere after #ifdef key and optionally #else
##############################################################################
sub Endif
{
    # this always terminates an if block
    return 1;
}


##############################################################################
# If conditionally includes or ignores parts of a file based on expr
# usage: #if expr
# expr is evaluated to true(1) or false(0) and include usual ==, !=, > etc.
# style comparisons. The "defined" keyword can also be used, ie: 
# #if defined MACRO || !defined(MACRO)
##############################################################################
sub If
{
    my $expr = shift;
    Debug("If: parsing: \"".$expr."\"", 2);

    # check for any "defined MACRO" tests and evaluate them
    if($expr =~ /defined/) {
	my $indefined = 0;
	
	# split expr up into its component parts, the split is done on the
	# following list of chars and strings: '!','(',')','&&','||', space
	my @Exprs = split(/([\s,\!,\(,\)]|\&\&|\|\|)/, $expr);
	
	# search through parts for "defined" keyword and check if macros
	# are defined
	foreach $expr (@Exprs) {
	    if($indefined == 1) {
		# previously found a defined keyword, check if next word
		# could be the macro to test for (not any of the listed chars)
		if($expr && $expr !~ /([\s,\!,\(,\)]|\&\&|\|\|)/) {
		    # replace macro with 0 or 1 depending if it is defined
		    Debug("If: testing if \"".$expr."\" defined...", 2);
		    if(CheckDefine($expr)) {
			$expr = 1;
			Debug("If: defined", 2);
		    }
		    else {
			$expr = 0;
			Debug("If: NOT defined", 2);
		    }
		    $indefined = 0;
		}	    
	    }
	    elsif($expr eq "defined") {
		# get rid of defined keyword
		$expr = "";
		# search for next macro following "defined"
		$indefined = 1;
	    }
	}
	
	# put full expr string back together
	my $newexpr = join('',@Exprs);
	$expr = $newexpr;
    }
    
    # pass parsed line though processors
    $expr = RunProcessors($expr);
    
    # evaluate line and return result (1 = true)
    Debug("If: evaluating \"".$expr."\"", 2);
    my $result = eval($expr);
    # check if statement is valid
    if(!defined($result)) { 
	# try to get rid of any remaining text - convert it to 0
	if($expr =~ /[a-z]|[A-Z]/) {
	    $expr =~ s/[a-z]|[A-Z]/0/g;
	    # tidy up 0's
	    $expr =~ s/0+/0/g;
	    Debug("If: WARNING - revaluated as \"".$expr."\"", 2);
	    $result = eval($expr);
	    if(!defined($result)) {
		Warning("\"".$@."\"");
		if($@ eq "") { $result = 1; }
		else { $result = 0; }
	    }
	}
    }
    if($result) {
	Debug("If: \"".$expr."\" true", 1);
	return 1;
    }
    Debug("If: \"".$expr."\" false", 1);
    return 0;
}


##############################################################################
# Elif equivalent to "else if".  Placed between #if[n][def] and #endif,
# equivalent to nesting #if's
##############################################################################
sub Elif
{
    my $input = shift;
    return If($input);
}


##############################################################################
# Ifdef conditionally includes or ignores parts of a file based on macro,
# usage: #ifdef MACRO
# if macro has been previously #define'd everything following the
# #ifdef will be included, else it will be ignored until #else or #endif
##############################################################################
sub Ifdef
{
    my $macro = shift;
    
    # separate macro from any trailing garbage
    $macro = substr($macro, 0, GetNextWordEnd($macro));
    
    # check if macro defined - if not set to be #ifdef'ed out
    if(CheckDefine($macro)) {
	Debug("Ifdef: ".$macro." defined", 1);
	return 1;
    }
    Debug("Ifdef: ".$macro." not defined", 1);
    return 0;
}


##############################################################################
# Ifndef conditionally includes or ignores parts of a file based on macro,
# usage: #ifndef MACRO
# if macro has been previously #define'd everything following the
# #ifndef will be ignored, else it will be included until #else or #endif
##############################################################################
sub Ifndef
{
    my $macro = shift;

    # separate macro from any trailing garbage
    $macro = substr($macro, 0, GetNextWordEnd($macro));
    
    # check if macro defined - if not set to be #ifdef'ed out
    if(CheckDefine($macro)) {
	Debug("Ifndef: ".$macro." defined", 1);
	return 0;
    }
    Debug("Ifndef: ".$macro." not defined", 1);
    return 1;
}


##############################################################################
# Parses all macros from file, but discards all other output
##############################################################################
sub IncludeMacros
{
    my $file = shift;
    my $currentoutput = $output;
    SetOutput(0);
    Parse($file);
    SetOutput($currentoutput);
}


##############################################################################
# Include $filename in output file, format:
# #include "filename" - local include file, ie. in same directory, try -Ipath
#                       also if not not found in current directory
# #include <filename> - system include file, use -Ipath
##############################################################################
sub Include
{
    my $input = shift;
    my $filename = $input;
    my $fullname;
    my $sysinclude = 0;
    my $found = 0;
    my $i;

    # check for recursive includes (level set to same as Perl recurse warn)
    if($include_level >= 98) { 
	Warning("Include recursion too deep - skipping \"".$filename."\"\n");
	return;
    }
    
    # replace any defined values in the include line
    $filename = RunProcessors($filename);

    # check if it is a system include file (#include <filename>) or a local 
    # include file (#include "filename")
    if(substr($filename, 0, 1) eq "<") {
	$sysinclude = 1;
	# remove <> from filename
	$filename = substr($filename, 1);
	($filename) = split(/\>/, $filename, 2);
    }
    elsif(substr($filename, 0, 1) eq "\"") {
	# remove double quotes from filename
	$filename = substr($filename, 1);
	($filename) = split(/\"/, $filename, 2);
    }
    # else assume filename given without "" or <>, naughty but allowed
    
    # check for file in current directory
    if($sysinclude == 0) {
	# get name of directory base file is in
	my $dir = "";
	if($file =~ /\//) {
	    my @Dirs = split(/(\/)/, $file);
	    for($i=0; $i<$#Dirs; $i++) {
		$dir = $dir.$Dirs[$i];
	    }
	}
	if(FileExists($dir.$filename)) {
	    $fullname = $dir.$filename;
	    $found = 1;
	}
    }

    # if first char in file is "/", ignore include path
    if($filename =~ /^\// && FileExists($filename)) {  
        $fullname = $filename;
        $found = 1;
    }

    # search for file in include paths, first path on command line first
    $i = 0;
    while($found == 0 && $i <= $#IncludePaths) {
	$fullname = $IncludePaths[$i]."/".$filename;
	if(FileExists($fullname)) { $found = 1; }
	$i++;
    }
    
    # include file if found, error if not
    if($found == 1) {
	Debug("Including file: \"".$fullname."\"", 1);
	# recursively call Parse
	Parse($fullname);
    }
    else {
	Warning("Include file \"".$filename."\" not found", 1);
    }
}



##############################################################################
# Pragma filepp Function Args
# Pragma executes a filepp function, everything following the function name
# is passed as arguments to the function.
# The format is:
# #pragma filepp function args...
# If pragma is not followed by "filepp", it is ignored.
##############################################################################
sub Pragma
{
    my $input = shift;
    
    # check for "filepp" in string
    if($input =~ /^filepp\b/) {
	my ($function, $args);
	($input, $function, $args) = split(/\s/, $input, 3);
	if($function) {
	    if(!$args) { $args = ""; }
	    if($safe_mode) {
		Debug("Safe mode enabled, NOT running: ".$function."(".$args.")", 1);
	    }
	    else {
		my @Args = ParseArgs($args);
		Debug("Running function: ".$function."(".$args.")", 1);
		$function->(@Args);
	    }
	}
    }
}


##############################################################################
# Turn normal output on/off (does not affect any output produced by keywords)
# 1 = on, 0 = off
##############################################################################
sub SetOutput
{
    $output = shift;
    Debug("Output set to ".$output, 2);
}


##############################################################################
# Turn blank suppression on and off at this include level
# 1 = on, 0 = off
##############################################################################
sub SetBlankSupp
{
    $blanksupp[$include_level] = shift;
    Debug("Blank suppression set to ".$blanksupp[$include_level], 2);
}


##############################################################################
# Reset blank suppression to command-line value (except at level 0)
##############################################################################
sub ResetBlankSupp
{
    if($include_level == 0) {
	$blanksupp[$include_level] = 0;
    } else {
	$blanksupp[$include_level] = $blanksuppopt;
    }
    Debug("Blank suppression reset to ".$blanksupp[$include_level], 2);
}


##############################################################################
# Set if macros are only replaced if the macro is a 'word'
##############################################################################
sub SetWordBoundaries
{
    my $on = shift;
    if($on) { 
	$bound = '\b';
	Debug("Word Boundaries turned on", 2);
    }
    else { 
	$bound = '';
	Debug("Word Boundaries turned off", 2);
    }
}

##############################################################################
# DEPRECATED - this function will be removed in later versions, use Set
# Toggle if macros are only replaced if the macro is a 'word'
##############################################################################
sub ToggleWordBoundaries
{
    if($bound eq '\b') { SetWordBoundaries(1); }
    else { SetWordBoundaries(0); }
}


##############################################################################
# Set treating keywordchar, contchar, macroprefix and optlineendchar as
# Perl regexps
##############################################################################
sub SetCharPerlre
{
    $charperlre = shift;
    Debug("Characters treated as Perl regexp's : ".$charperlre, 2);
}


##############################################################################
# Undef a previously defined variable, usage:
# #undef $macro
##############################################################################
sub Undef
{
    my $macro = shift;
    my $i;
    
    # separate macro from any trailing garbage
    $macro = substr($macro, 0, GetNextWordEnd($macro));
    
    # delete macro from table
    delete $Defines{$macro};
    delete $DefinesArgs{$macro};
    delete $DefinesFuncs{$macro};
    
    # and remove its eat-trailing-whitespace flag
    if(CheckEatTrail($macro)) { delete $EatTrail{$macro}; }

    # regenerate keys
    GenerateDefinesKeys();
    
    Debug("Undefined macro \"".$macro."\"", 2);
    if($debug > 1) { PrintDefines(); }
}


##############################################################################
# UndefAll - undefines ALL macros
##############################################################################
sub UndefAll
{
    %Defines = ();
    %DefineLookup = ();
    %EatTrail = ();
    $defmin = $defmax = 0;
    Debug("Undefined ALL macros", 2);
    if($debug > 1) { PrintDefines(); }
}


##############################################################################
# #warning msg  - print warning message "msg"
##############################################################################
sub Warning
{
    my $msg = shift;
    my $lastdebug = $debug;
    $debug = 1;
    Debug($msg, 1);
    $debug = $lastdebug;
}


##############################################################################
# ParseLineEnd - takes in line from input most recently read and checks
# if line should be continued (ie. next line in input read and appended
# to current line).
# Returns two values:
# $more - boolean, 1 = read another line from input to append to this one
#                  0 = no line continuation
# $line - the line to be read.  If any modification needs to be done to the
#         line for line contination, it is done here.
#         Example: if line is to be continued: set $more = 1, then
#                  remove line continuation character and newline from end of
#                  $line and replace with line continuation character.
##############################################################################
sub ParseLineEnd
{
    my $thisline = shift;
    my $more = 0;
    # check if end of line has a continuation char, if it has get next line
    if($thisline =~ /$contchar$/) {
	$more = 1;
	# remove backslash and newline
	$thisline =~ s/$contchar\n\Z//;
	# append line continuation character
	$thisline = $thisline.$contrepchar;
    }
    return ($more, $thisline);
}


##############################################################################
# Set name of function to take check if line shoule be continued
##############################################################################
sub SetParseLineEnd
{
    my $func = shift;
    $parselineend = $func;
}

##############################################################################
# Get name of function to take check if line shoule be continued
##############################################################################
sub GetParseLineEnd
{
    return $parselineend;
}


##############################################################################
# GetNextLine - returns the next line of the current INPUT line,
# line continuation is taken care of here.
##############################################################################
sub GetNextLine
{
    my $thisline = <INPUT>;
    if($thisline) {
	Redefine("__LINE__", ++$line);
	my $more = 0;
	($more, $thisline) = $parselineend->($thisline);
	while($more) {
	    Debug("Line continuation", 2);
	    my $nextline = <INPUT>;
	    if(!$nextline) { return $thisline; }	    
	    # increment line count
	    Redefine("__LINE__", ++$line);
	    ($more, $thisline) = $parselineend->($thisline.$nextline);
	    # maintain same number of lines in input as output
	    if($preserveblank) { Filepp::Output("\n"); }
	}
    }
    return $thisline;
}


##############################################################################
# Write($string) - writes $string to OUTPUT file
##############################################################################
sub Write
{
    my $string = shift;
    print(OUTPUT $string);
}


##############################################################################
# Output($string) - conditionally writes $string to OUTPUT file
##############################################################################
sub Output
{
    my $string = shift;
    if($output) { Write($string); }
}

# counter for number of #if[n][def] loops currently in
my $iflevel = 0;
# flag to control when to write output
my @Writing = (1); # initialise default to 'writing'
# flag to show if current 'if' block has passed a 'true if'
my @Ifdone = (0); # initialise first to 'not passed true if'

##############################################################################
# Keyword parsing routine
##############################################################################
sub ParseKeywords
{
    # input is next line in file
    my $inline = shift;
    my $outline = "";

    my $thisline = $inline;	
    my $keyword;
    my $found = 0;
    # remove whitespace from start of line
    $thisline = CleanStart($thisline);
    # check if first char on line is a #
    if($thisline && $thisline =~ /^$keywordchar/) {
	# remove "#" and any following whitespace
	$thisline =~ s/^$keywordchar\s*//g;
	# remove the optional end line char
	if($optlineendchar ne "") {
	    $thisline =~ s/$optlineendchar\Z//g;
	}
	# check for keyword
	if($thisline && $thisline =~ /^\w+\b/ && exists($Keywords{$&})) {
	    $keyword = $&;
	    $found = 1;
	    # remove newline from line
	    chomp($thisline);
	    # remove leading whitespace and keyword from line
	    my $inline = CleanStart(substr($thisline, length($keyword)));
	    
	    # check for 'if' style keyword
	    if(exists($Ifwords{$keyword})) {
		# increment ifblock level and set ifdone to same
		# value as previous block
		$iflevel++;
		$Ifdone[$iflevel] = 0;
		$Writing[$iflevel] = $Writing[$iflevel - 1];
		if(!$Writing[$iflevel]) { $Ifdone[$iflevel] = 1; }
	    }
	    # check for out of place 'else' or 'endif' style keyword
	    elsif($iflevel <= 0 && (exists($Elsewords{$keyword}) ||
				    exists($Endifwords{$keyword}) )) {
		Warning($keywordchar.$keyword." found without preceding ".
			$keywordchar."[else]ifword");
	    }
	    
	    # decide if to run 'if' or 'else' keyword
	    if(exists($Ifwords{$keyword}) || exists($Elsewords{$keyword})){
		if(!($Ifdone[$iflevel])) {
		    # check return value of 'if'
		    if($Keywords{$keyword}->($inline)) {
			$Ifdone[$iflevel] = 1;
			$Writing[$iflevel] = 1;
		    }
		    else { $Writing[$iflevel] = 0; }
		}
		else { $Writing[$iflevel] = 0; }
	    }
	    # check for 'endif' style keyword
	    elsif(exists($Endifwords{$keyword})) {
		# run endif keyword and decrement iflevel if true
		if($Keywords{$keyword}->($inline)) { $iflevel--; }
	    }
	    # run all other keywords
	    elsif($Writing[$iflevel]) { $Keywords{$keyword}->($inline); }
	    
	    # write a blank line if preserving blank lines
	    # (assumes keywords have no output)
	    if($preserveblank) { $outline = $outline."\n"; }
	    
	} # keyword if statement
    }
    # no keywords in line - write line to file if not #ifdef'ed out
    if(!$found && $Writing[$iflevel]) {
	$outline = $outline.$inline;
    }
    # keep same number of files in output and input
    elsif(!$found && $preserveblank) { $outline = $outline."\n"; }

    return $outline;
}


##############################################################################
# Main parsing routine - inputs either:
# Parse($file) - open file name $file and parse it,
# Parse("<", $var [, $line]) - read input from variable $var and parse it,
#   optional $line var sets __LINE__ to $line, used in grab.pm
##############################################################################
sub Parse
{        
    # change file being parsed to this file, remember last filename so
    # it can be returned at the end
    my $lastparse = $file;
    $file = shift;
    my $varmode = 0;
    my $lastcount = $line; # current line number

    # increment parse level
    $parse_level++;
    
    # input passed as a variable rather than file
    if($file eq "<" && $#_ >= 0) {
	$varmode = 1;
	$file = $lastparse; # leave filename alone
	if($#_ >= 1) { $line = $_[1]; } # set line number if provided
	Debug("Parsing variable...", 3);
    }
    
    if(!$varmode) {
	Debug("Parsing ".$file."...", 1);
	Redefine("__FILE__", $file);
	
	# increment include level
	Redefine("__INCLUDE_LEVEL__", ++$include_level);
	
	# set blank line suppression:
	# no suppression for top level files
	if($include_level == 0) {
	    $blanksupp[$include_level] = 0;
	}
	# include level 1 - set suppression to command line given value
	elsif($include_level == 1) {
	    # inherit root value if set
	    if($blanksupp[0]) { $blanksupp[$include_level] = 1; }
	    else {$blanksupp[$include_level] = $blanksuppopt; }
	}
	# all other include levels - keep suppression at existing value
	else {
	    $blanksupp[$include_level] = $blanksupp[$include_level - 1];
	}
	
	# reset line count, remembering previous count for future reference
	$line = 0;
    }
    Redefine("__LINE__", $line);
    
    # open file and set its handle to INPUT
    local *INPUT;
    # input passed as a variable rather than file
    if($varmode) {
	if(!open(INPUT, "<", \$_[0])) {
	    Error("Could not open variable ".$_[0]." for parsing");
	}
    }
    elsif(!open(INPUT, $file)) {
	Error("Could not open file ".$file);
    }
    
    # if a base file, run any initialisation functions
    if(!$varmode && $include_level == 0) {
	my $func;
	foreach $func (@OpenInputFuncs) { $func->(); }
    }
    
    # parse each line of file
    $_ = GetNextLine();
    # if in "shebang" mode, throw away first line (the #!/blah bit)
    if(!$varmode && $shebang) {
	# check for "#!...perl ...filepp..."
	if($_ && $_ =~ /^\#\!.*perl.+filepp/) {  
	    Debug("Skipping first line (shebang): ".$_, 1);
	    $_ = GetNextLine();
	}
    }
    
    while($_) {
	# unless blank lines are suppressed at this include level
	unless($blanksupp[$include_level] && /^\s*$/) {
	    # run processing chain (defaults to ReplaceDefines)
	    $_ = RunProcessors($_, 1);
	    # write output to file or STDOUT
	    if($output) { Write($_); }
	}
	$_ = GetNextLine();
    }
    
    # run any close functions
    if(!$varmode && $include_level == 0) {
	my $func;
	foreach $func (@CloseInputFuncs) { $func->(); }
    }
    
    # check all #if blocks have been closed at end of parsing
    if($lastparse eq "" && $iflevel > 0) { Warning("Unterminated if block"); }
    
    # close file
    close(INPUT);
    
    if(!$varmode) {
	Debug("Parsing ".$file." done. (".$line." lines processed)", 1);
    }
    
    # reset $line
    $line = $lastcount;	
    Redefine("__LINE__", $line);
    
    if(!$varmode) {
	# reset $file
	$file = $lastparse;
	Redefine("__FILE__", $file);
	if($file ne "") {
	    Debug("Parsing returned to ".$file." at line ".$line, 1);
	}	
	# decrement include level
	Redefine("__INCLUDE_LEVEL__", --$include_level);
    }
    else {
	Debug("Parsing variable done", 3);

    }
    # decrement parse level
    $parse_level--;
}

##############################################################################
# Main routine
##############################################################################

# parse command line
my $i=0;
my $argc=0;
while($ARGV[$argc]) { $argc++; }

while($ARGV[$i]) {

    # suppress blank lines in header files
    if($ARGV[$i] eq "-b") {
	$blanksuppopt = 1;
    }

    # read from stdin instead of file
    elsif($ARGV[$i] eq "-c") {
	AddInputFile("-");
    }
    
    # Defines: -Dmacro[=defn] or -D macro[=defn]
    elsif(substr($ARGV[$i], 0, 2) eq "-D") {
	my $macrodefn;
	# -D macro[=defn] format
	if(length($ARGV[$i]) == 2) {
	    if($i+1 >= $argc) {
		Error("Argument to `-D' is missing");
	    }
	    $macrodefn = $ARGV[++$i];
	}
	# -Dmacro[=defn] format
	else {
	    $macrodefn = substr($ARGV[$i], 2);
	}
	my $macro = $macrodefn;
	my $defn = "";
	my $j = index($macrodefn, "=");
	if($j > -1) {
	    $defn  = substr($macrodefn, $j+1);
	    $macro = substr($macrodefn, 0, $j);
	}
	# add macro and defn to hash table
	Define($macro." ".$defn);
    }

    # Debugging turned on: -d
    elsif($ARGV[$i] eq "-d") {
	SetDebug(2);
    }

    # Full debugging turned on: -dd
    elsif($ARGV[$i] eq "-dd") {
	SetDebug(3);
    }

    # Light debugging turned on: -dl
    elsif($ARGV[$i] eq "-dl") {
	SetDebug(1);
    }

    # Send debugging info to stdout rather than stderr
    elsif($ARGV[$i] eq "-ds") {
	$debugstdout = 1;
    }

    # prefix all debugging info with string
    elsif($ARGV[$i] eq "-dpre") {
	if($i+1 >= $argc) {
	    Error("Argument to `-dpre' is missing");
	}
	$debugprefix = ReplaceDefines($ARGV[++$i]);
    }

    # prefix all debugging info with string
    elsif($ARGV[$i] eq "-dpost") {
	if($i+1 >= $argc) {
	    Error("Argument to `-dpost' is missing");
	}
	# replace defines is called here in case a newline is required,
	# this allows it to be added as __NEWLINE__
	$debugpostfix = ReplaceDefines($ARGV[++$i]);
    }

    # define environment variables as macros: -e
    elsif($ARGV[$i] eq "-e") {
	DefineEnv();
    }

    # set environment variable prefix char
    elsif($ARGV[$i] eq "-ec") {
	if($i+1 >= $argc) {
	    Error("Argument to `-ec' is missing");
	}
	SetEnvchar($ARGV[++$i]);
    }

    # set environment variable prefix char to nothing
    elsif($ARGV[$i] eq "-ecn") {
	SetEnvchar("");
    }

    # show help
    elsif($ARGV[$i] eq "-h") {
	print(STDERR $usage);
	exit(0);
    }

    # Include paths: -Iinclude or -I include
    elsif(substr($ARGV[$i], 0, 2) eq "-I") {
	# -I include format
	if(length($ARGV[$i]) == 2) {
	    if($i+1 >= $argc) {
		Error("Argument to `-I' is missing");
	    }
	    AddIncludePath($ARGV[++$i]);
	}
	# -Iinclude format
	else {
	    AddIncludePath(substr($ARGV[$i], 2));
	}
    }

    # Include macros from file: -imacros file
    elsif($ARGV[$i] eq "-imacros") {
	if($i+1 >= $argc) {
	    Error("Argument to `-imacros' is missing");
	}
	push(@Imacrofiles, $ARGV[++$i]);
    }

    # turn off keywords
    elsif($ARGV[$i] eq "-k") {
	RemoveAllKeywords();
    }

    # set keyword prefix char
    elsif($ARGV[$i] eq "-kc") {
	if($i+1 >= $argc) {
	    Error("Argument to `-kc' is missing");
	}
	SetKeywordchar($ARGV[++$i]);
    }

    # set line continuation character
    elsif($ARGV[$i] eq "-lc") {
	if($i+1 >= $argc) {
	    Error("Argument to `-lc' is missing");
	}
	SetContchar($ARGV[++$i]);
    }

    # set optional line end character
    elsif($ARGV[$i] eq "-lec") {
	if($i+1 >= $argc) {
	    Error("Argument to `-lec' is missing");
	}
	SetOptLineEndchar($ARGV[++$i]);
    }

    # set line continuation replacement char to newline
    elsif($ARGV[$i] eq "-lrn") {
	SetContrepchar("\n");
    }

    # set line continuation replacement character
    elsif($ARGV[$i] eq "-lr") {
	if($i+1 >= $argc) {
	    Error("Argument to `-lr' is missing");
	}
	SetContrepchar($ARGV[++$i]);
    }

    # Module paths: -Minclude or -M include
    elsif(substr($ARGV[$i], 0, 2) eq "-M") {
	# -M include format
	if(length($ARGV[$i]) == 2) {
	    if($i+1 >= $argc) {
		Error("Argument to `-M' is missing");
	    }
	    AddModulePath($ARGV[++$i]);
	}
	# -Minclude format
	else {
	    AddModulePath(substr($ARGV[$i], 2));
	}
    }

    # use module
    elsif($ARGV[$i] eq "-m") {
	if($i+1 >= $argc) {
	    Error("Argument to `-m' is missing");
	}
	UseModule($ARGV[++$i]);
    }

    # set macro prefix
    elsif($ARGV[$i] eq "-mp") {
	if($i+1 >= $argc) {
	    Error("Argument to `-mp' is missing");
	}
	SetMacroPrefix($ARGV[++$i]);
    }
    
    # turn off macro prefix within keywords
    elsif($ARGV[$i] eq "-mpnk") {
	$macroprefixinkeywords = 0;
    }
    
    # turn on overwrite mode
    elsif($ARGV[$i] eq "-ov") {
	$overwrite = 1;
    }
    
    # turn on overwrite conversion mode
    elsif($ARGV[$i] eq "-ovc") {
  	if($i+1 >= $argc) {
	    Error("Argument to `-ovc' is missing");
	}
	$overwriteconv = $ARGV[++$i];
	if($overwriteconv !~ /=/) {
	    Error("-ovc argument is of form IN=OUT");
	}
	$overwrite = 1;	
    }
    
    # Output filename: -o filename or -ofilename
    elsif(substr($ARGV[$i], 0, 2) eq "-o") {
	# -o filename
	if(length($ARGV[$i]) == 2) {
	    if($i+1 >= $argc) {
		Error("Argument to `-o' is missing");
	    }
	    $outputfile = $ARGV[++$i];
	}
	# -ofilename
	else {
	    $outputfile = substr($ARGV[$i], 2);
	}
    }

    # preserve blank lines in output file
    elsif($ARGV[$i] eq "-pb") {
	$preserveblank = 1;
    }

    # treat $keywordchar, $contchar and $optlineendchar as regular expressions
    elsif($ARGV[$i] eq "-re") {
	if($charperlre) { SetCharPerlre(0); }
	else { SetCharPerlre(1); }
    }
    
    # Safe mode - turns off #pragma
    elsif($ARGV[$i] eq "-s") {
	SafeMode();
    }
    
    # Undef: -Umacro or -U macro
    elsif(substr($ARGV[$i], 0, 2) eq "-U") {
	my $macro;
	# -U macro format
	if(length($ARGV[$i]) == 2) {
	    if($i+1 >= $argc) {
		Error("Argument to `-U' is missing");
	    }
	    $macro = $ARGV[++$i];
	}
	# -Umacro format
	else {
	    $macro = substr($ARGV[$i], 2);
	}
	# undef macro
	Undef($macro);
    }

    # Undefine all macros
    elsif($ARGV[$i] eq "-u") {
	UndefAll();
    }

    # print version number and exit
    elsif($ARGV[$i] eq "-v") {
	print(STDERR "filepp version ".$VERSION."\n");
	exit(0);
    }

    # only replace macros if they appear as 'words'
    elsif($ARGV[$i] eq "-w") {
	if($bound eq '') { SetWordBoundaries(1); }
	else { SetWordBoundaries(0); }
    }
    
    # default - an input file name
    else {
	if(!FileExists($ARGV[$i])) {
	    Error("Input file \"".$ARGV[$i]."\" not readable");
	}
	AddInputFile($ARGV[$i]);
    }

    $i++;
}

# check input files have been specified
if($#Inputfiles == -1) {
    Error("No input files given");
}

# import macros from file if any
if($#Imacrofiles >= 0) {
    my $file;
    foreach $file (@Imacrofiles) { IncludeMacros($file); }
}

# print initial defines if debugging
if($debug > 1) { PrintDefines(); }

# open the output file
if(!$overwrite) { OpenOutputFile($outputfile); }

# parse all input files in order given on command line
my $base_file = "";
foreach $base_file (@Inputfiles) {
    Redefine("__BASE_FILE__", $base_file);
    # set open output file if in overwrite mode
    if($overwrite) {
	if($overwriteconv ne "") { # convert output filename if needed
	    my ($in,$out) = split(/=/, $overwriteconv, 2);
	    my $outfile = $base_file;
	    $outfile =~ s/\Q$in\E/$out/;
	    OpenOutputFile($outfile);
	}
	else { OpenOutputFile($base_file); }
    }
    Parse($base_file);
    # close output file if in overwrite mode
    if($overwrite) { CloseOutputFile(); }    
}

# close output file
if(!$overwrite) { CloseOutputFile(); }

exit(0);

# Hey emacs !!
# Local Variables:
# mode: perl
# End:

########################################################################
# End of file
########################################################################
