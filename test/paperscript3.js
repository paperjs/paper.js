
function drawText3(coords, txt) {
    var text = new PointText(coords);
    text.characterStyle.fontSize = 20;
    text.fillColor = 'black';
    text.content = txt;
};



drawText3([80, 120], 'hello from paperscript3');

