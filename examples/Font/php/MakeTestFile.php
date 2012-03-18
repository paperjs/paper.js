<?php
define( "FONT_ROOT", "../fonts" );
define( "TEST_FILE_ROOT", "../testfiles" );

if( is_dir( TEST_FILE_ROOT ) ){
	$dir = opendir( TEST_FILE_ROOT );
	while( ( $testfile = readdir( $dir ) ) !== false ){
		if( $testfile == "." || $testfile == ".." ){
			continue;
		}
		unlink( TEST_FILE_ROOT."/".$testfile );
	}
}


$stream;
$files = array();
$docs = array();
$svgs = array();
$testSVGS = array();


if( is_dir( FONT_ROOT ) ){
	$stream = opendir( FONT_ROOT );
	while( ( $file = readdir( $stream ) ) !== false ) {
		if( $file == "." || $file == ".." ){
			continue;
		}
		array_push( $files, FONT_ROOT."/".$file );
	}
	closedir( $stream );
} else {
	throw new Exception( FONT_ROOT." is not a directory" );
}

$doc;
for( $f=0; $f < count( $files ); $f++ ){
	$doc = new DOMDocument();
	$doc->load( $files[ $f ] );
	array_push( $docs, $doc ); 
}

$testSVG;
$testfileRessource;
$root;
$fonts;
$glyphs;

echo "<html><head><title>SVG test files for fonts</title></head><body>";


for( $d = 0; $d < count( $docs ); $d++ ) {
	$testSVG = new DOMDocument();
	$testSVG->formatOutput = true;
	$root = $testSVG->createElement( "svg" );
	$root->setAttribute( "xmlns", "http://www.w3.org/2000/svg" );
	$root->setAttribute( "width", "100000" );
	$root->setAttribute( "height", "2000" );
	$root->setAttribute( "viewbox", "0 0 100000 2000" );
	$testSVG->appendChild( $root );

	$fonts = $docs[ $d ]->getElementsByTagName( "font" );
	$hadv = 0;
	$xposition = 0; 
	for( $font = 0; $font < $fonts->length; $font++ ){
		if( $fonts->item( $font )->hasAttribute( "horiz-adv-x" ) ){
			$hadv = floatval($fonts->item( $font )->getAttribute( "horiz-adv-x" ) );
		}

		$glyphs = $fonts->item( $font )->getElementsByTagName( "glyph" );

		$outer;
		$inner;
		$line;
		$length;
		$rect;
		$transform;
		$pathData;

		for( $glyph = 0; $glyph < $glyphs->length; $glyph++ ){
			$outer = $testSVG->createElement( "g" );
			if( $fonts->item( $font )->hasAttribute( "transform" ) ){
				$transform = $testSVG->createAttribute( "transform" );
				$transform->value = $fonts->item( $font )->getAttribute( "transform" );
				$outer->appendChild( $transform );

			}
		
			$outer->setAttribute( "transform", "translate( ".$xposition.", 900 ) scale( 1, -1 )" );

			$inner = $testSVG->createElement( "g" );
			if( $glyphs->item( $glyph )->hasAttribute( "transform" ) ){
				$transform = $testSVG->createAttribute( "transform" );
				$transform->value = $glyphs->item( $glyph )->getAttribute( "transform" );
				$inner->appendChild( $transform );
			}
			
			$outer->appendChild( $inner );
			$root->appendChild( $outer );
			
			if( $glyphs->item( $glyph )->hasAttribute( "d" ) ){
				$path = $testSVG->createElement( "path" );
				$pathData = $testSVG->createAttribute( "d" );
				$pathData->value = $glyphs->item( $glyph )->getAttribute( "d" );
				$path->appendChild( $pathData );
				$inner->appendChild( $path );
			}

			if( $glyphs->item( $glyph )->hasChildNodes()) {
				echo "hallo";
			}

			if( $glyphs->item( $glyph )->hasAttribute( "horiz-adv-x" ) ){
				$xposition += /*$hadv +*/ floatval( $glyphs->item( $glyph )->getAttribute( "horiz-adv-x" ) );
				$length = /*$hadv +*/ floatval( $glyphs->item( $glyph )->getAttribute( "horiz-adv-x" ) );
			} else {
				$xposition += $hadv;
				$length = $hadv;
			}
		}
	}

	$testfileRessource = fopen( TEST_FILE_ROOT."/".preg_replace('/[\.\/]*/', "_", $files[ $d ] ).".svg", "w" );
	//echo "<div>".
	echo $testSVG->saveXML();//."</div>";
	fwrite( $testfileRessource, $testSVG->saveXML() );
	fclose( $testfileRessource );
}

echo "</body></html>";
?>