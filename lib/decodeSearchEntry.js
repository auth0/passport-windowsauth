function formatGuid(data) {
  var format = '{3}{2}{1}{0}-{5}{4}-{7}{6}-{8}{9}-{10}{11}{12}{13}{14}{15}';
  for (var i = 0; i < data.length; i++) {
    var re = new RegExp('\\{' + i + '\\}', 'g');
    // Leading 0 is needed if value of data[i] is less than 16 (of 10 as hex).
    var dataStr = data[i].toString(16);
    format = format.replace(re, data[i] >= 16 ? dataStr : '0' + dataStr);
  }
  return format;
}

module.exports = function(entry) {
  var obj = {
    dn: entry.dn.toString(),
    controls: []
  };

  entry.attributes.forEach(function (a) {
    var buf = a.buffers;
    var val = a.vals;
    var item;

    switch (a.type) {
      case 'thumbnailPhoto':
        item = buf;
        break;
      case 'objectGUID':
        item = formatGuid(buf[0]);
        break;
      default:
        item = val;
    }

    if (item && item.length) {
      if (item.length > 1) {
        obj[a.type] = item.slice();
      } else {
        obj[a.type] = item[0];
      }
    } else {
      obj[a.type] = [];
    }
  });

  entry.controls.forEach(function (element) {
    obj.controls.push(element.json);
  });

  return obj;
};
