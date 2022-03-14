Helper.string = function () {


    return {
        shortenTo: function (text, length) {
            if (length < text.length) {
                text = text.substring(0, length) + '...';
            }

            return text;
        },
        escapeHTML: function (text) {
            return text
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        },

        decodeURIComponentSafe: function (s) {
            if (!s) {
                return s;
            }
            return decodeURIComponent(s.replace(/%(?![0-9][0-9a-fA-F]+)/g, '%25'));

        },

        uuid: function () {

            var d = new Date().getTime();
            var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
            return uuid;
        },
        utf16toEntities: function (str) {
            var patt = /[\ud800-\udbff][\udc00-\udfff]/g; // 检测utf16字符正则
            str = str.replace(patt, function (char) {
                var H, L, code;
                if (char.length === 2) {
                    H = char.charCodeAt(0); // 取出高位
                    L = char.charCodeAt(1); // 取出低位
                    code = (H - 0xD800) * 0x400 + 0x10000 + L - 0xDC00; // 转换算法
                    return "&#" + code + ";";
                } else {
                    return char;
                }
            });
            return str;
        },
        uncodeUtf16: function (str) {
            var reg = /\&#.*?;/g;
            var result = str.replace(reg, function (char) {
                var H, L, code;
                if (char.length == 9) {
                    code = parseInt(char.match(/[0-9]+/g));
                    H = Math.floor((code - 0x10000) / 0x400) + 0xD800;
                    L = (code - 0x10000) % 0x400 + 0xDC00;
                    return unescape("%u" + H.toString(16) + "%u" + L.toString(16));
                } else {
                    return char;
                }
            });
            return result;
        },
        replace_words_frequency_bad_chars: function (text) {

            text = text.replace(/’/g, "'");

            text = text.replace(/"(.+)"/g, '$1');
            // text = text.replace(/(.+)\./g, '$1');
            // text = text.replace(/(.+)!/g, '$1');
            text = text.replace(/\s-\s/g, " ");
            text = text.replace(/-\s/g, " ");
            text = text.replace(/\s-/g, " ");
            text = text.replace(/\s+/g, " ");
            text = text.replace(/&nbsp;/g, " ");
            text = text.replace(/\s-\s/g, " ");
            text = text.replace(/\s\–\s/, " ");
            text = text.replace(/\./g, '');
            text = text.replace(/!/g, '');
            text = text.replace(/,/g, '');
            text = text.replace(/`/g, '');
            text = text.replace(/\//g, ' ');
            text = text.replace(/;/g, '');


            text = text.replace(/\//g, ' ');


            // let regx = new RegExp("[%+_〜`~!@#$^*&()=|{}:;,\\[\\]<>/?~！@#￥……&*（）|{}【】‘；：”“。，、？・]", "g");
            // text = text.replace(regx, " ");

            text = text.replace(/\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g, "");


            return $.trim(text);
        }


    }
}();