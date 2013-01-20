
function drawText2(coords, txt) {
    var text = new PointText(coords);
    text.characterStyle.fontSize = 20;
    text.fillColor = 'black';
    text.content = txt;
};



drawText2([80, 120], 'hello from paperscript2');

