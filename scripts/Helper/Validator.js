Helper.validator = function () {
    return {
        isInt: function (str) {
            return CONST.re_int.test(str);
        },

        isFloat: function (str) {
            return CONST.re_float.test(str);
        },


        toInt: function (text) {
            let val = 0;
            if (text) {
                text = $.trim(text);
                text = text.replace(/[^0-9]/g, '');
                if (CONST.re_int.test(text)) {
                    val = parseInt(text);
                }
            }
            return val;
        },

        toFloat: function (text) {

            if (text) {
                text = $.trim(text);
                text = text.replace(/[^0-9.,]/g, '');
                text = text.replace(".00", "");
                if (text.indexOf(".") > -1 && text.indexOf(",") > -1) {
                    text = text.replace(".", "");
                    text = text.replace(",", ".")
                } else if (text.indexOf(",") > -1) {
                    text = text.replace(",", ".");
                }
                if (CONST.re_float.test(text)) {
                    return parseFloat(text);
                }

            }
            return 0;
        },

        isString: function (text) {
            return (typeof text == 'string') && text.constructor == String;
        },

        isArray: function (obj) {

            return (typeof obj == 'object') && obj.constructor == Array;

        },
        isEmail: function (str) {
            return CONST.re_email.test(String(str).toLowerCase());
        },
        isEmpty: function (a) {
            if (a === "") return true; //检验空字符串
            if (a === "null") return true; //检验字符串类型的null
            if (a === "undefined") return true; //检验字符串类型的 undefined
            if (!a && a !== 0 && a !== "") return true; //检验 undefined 和 null
            if (Object.prototype.toString.call(a) == '[object Array]' && a.length === 0) return true; //检验空数组
            if (Object.prototype.toString.call(a) == '[object Object]' && Object.keys(a).length === 0) return true; //检验空对象
            return false;
        }
    }
}();
