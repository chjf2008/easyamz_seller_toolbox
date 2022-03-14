/**
 * Provides helper functions for numbers
 * @type {{toNumber, formatToString}}
 */
Helper.number = function () {

    return {
        toNumber: function (text, decimals) {
            text = "" + text;
            text = text.replaceAll(",", "");
            var number = parseFloat(text);
            return Number(number.toFixed(decimals));
        },
        formatToString: function (nStr) {
            nStr += '';
            var x = nStr.split('.');
            var x1 = x[0];
            var x2 = x.length > 1 ? '.' + x[1] : '';
            var rgx = /(\d+)(\d{3})/;
            while (rgx.test(x1)) {
                x1 = x1.replace(rgx, '$1' + ',' + '$2');
            }
            return x1 + x2;
        },
        formatToNumber: function (text, decimals) {
            var number = this.toNumber(text, decimals);
            number = this.formatToString(number);
            return number;
        }
    }
}();