<?php
class SVGList extends DOMDocument {
	
	const SVG_LOCATION = "../svg";
	const BASE = "svg/";

	private $root;

	public function __construct(){
		parent::__construct( "1.0", "utf-8" );
		$this->root = $this->createElement( "svg-list" );
		$this->appendChild( $this->root );

		$scan = scandir( self::SVG_LOCATION );
		$file;
		for( $i = 0; $i < count(  $scan ); $i++ ){
			$file = $scan[ $i ];
			if( $file == "." || $file == ".." ){
				continue;
			}
			$this->root->appendChild( $this->makeElement( $file ) );
		}
	}

	private function makeElement( $file ){
		$e = $this->createElement( "file" );
		$a = $this->createAttribute( "path" );
		$a->value = self::BASE.$file;
		$e->appendChild( $a );

		$a2 = $this->createAttribute( "name" );
		$a2->value = $file;
		$e->appendChild( $a2 );

		return $e;
	}
}
$list = new SVGList();
header("content-type: text/xml");
echo $list->saveXML()
?>