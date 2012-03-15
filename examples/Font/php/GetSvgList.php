<?php
class SVGList extends DOMDocument {
	
	const SVG_LOCATION = "../svg";
	//const BASE = "svg/";
	const GET_DIR_FIELD = "dir";

	private $root;

	private $base;

	public function __construct(){
		parent::__construct( "1.0", "utf-8" );
		$this->root = $this->createElement( "svg-list" );
		$this->appendChild( $this->root );

		

		$scan = $this->getScan();//scandir( self::SVG_LOCATION );
		$file;
		for( $i = 0; $i < count(  $scan ); $i++ ){
			$file = $scan[ $i ];
			if( $file == "." || $file == ".." || $file == "" ){
				continue;
			}
			$this->root->appendChild( $this->makeElement( $file ) );
		}
	}

	private function getScan(){
		$scan = array();
		if( isset( $_GET[ self::GET_DIR_FIELD ] ) && 
				!empty( $_GET[ self::GET_DIR_FIELD ] ) ){
			$this->base = $_GET[ self::GET_DIR_FIELD ]."/";
			$scan = @scandir( "../".$_GET[ self::GET_DIR_FIELD ] );
			try{
				if( $scan == false ){
					throw new Exception("Error Processing Request", 1 );
				} 
			} catch ( Exception $e ){
				$scan = array();
			}
		}
		return $scan;
	}

	private function makeElement( $file ){
		$e = $this->createElement( "file" );
		$a = $this->createAttribute( "path" );
		$a->value = $this->base.$file;
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