
function drawText1(coords, txt) {
    var text = new PointText(coords);
    text.characterStyle.fontSize = 20;
    text.fillColor = 'black';
    text.content = txt;
};



drawText1([80, 80], 'hello from paperscript1');

