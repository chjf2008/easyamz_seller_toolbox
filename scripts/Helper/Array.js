/**
 * Provides helper functions for arrays
 * @type {{flip}}
 */
Helper.array = function () {
    return {
        flip: function (array) {
            var tmpArray = [];
            $.each(array, function (index, value) {
                tmpArray[value] = index;
            });
            return tmpArray;
        },
        clean: function (array) {  //function to remove. 'null', '0', '""', 'false', 'undefined' and 'NaN' values from an array
            var index = -1,
                arr_length = array ? array.length : 0,
                resIndex = -1,
                result = [];

            while (++index < arr_length) {
                var value = array[index];

                if (null != value) {
                    result[++resIndex] = value;
                }
            }

            return result;
        },
        

        random: function (array) {
            return array[Math.floor((Math.random() * array.length))];
        },

        wordsmap: function (txt, intWords) {


            if (txt == "") {
                return [];
            }
            var wc = [];
            var wc2 = [];
            var key;
            var key2;
            txt = txt.trim().toLowerCase();
            if (txt == "") {
                return [];
            }
            var pword = "";
            var ppword = "";
            var pppword = "";
            var ppppword = "";
            var w;
            if (intWords == 1) {
                wc = txt.split(/\s+/).reduce(function (count, word) {
                    count[word] = count.hasOwnProperty(word) ? count[word] + 1 : 1;
                    return count;
                }, {});
            } else if (intWords == 2) {
                wc = txt.split(/\s+/).reduce(function (count, word) {
                    w = pword + " " + word;
                    if (pword != "") {
                        count[w] = count.hasOwnProperty(w) ? count[w] + 1 : 1;
                    }
                    pword = word;
                    return count;
                }, {});
            } else if (intWords == 3) {
                wc = txt.split(/\s+/).reduce(function (count, word) {
                    w = ppword + " " + pword + " " + word;
                    if (ppword != "" && pword != "") {
                        count[w] = count.hasOwnProperty(w) ? count[w] + 1 : 1;
                    }
                    ppword = pword;
                    pword = word;
                    return count;
                }, {});
            } else if (intWords == 4) {
                wc = txt.split(/\s+/).reduce(function (count, word) {
                    w = pppword + " " + ppword + " " + pword + " " + word;
                    if (pppword != "" && ppword != "" && pword != "") {
                        count[w] = count.hasOwnProperty(w) ? count[w] + 1 : 1;
                    }
                    pppword = ppword;
                    ppword = pword;
                    pword = word;
                    return count;
                }, {});
            } else if (intWords == 5) {
                wc = txt.split(/\s+/).reduce(function (count, word) {
                    w = ppppword + " " + pppword + " " + ppword + " " + pword + " " + word;
                    if (ppppword != "" && pppword != "" && ppword != "" && pword != "") {
                        count[w] = count.hasOwnProperty(w) ? count[w] + 1 : 1;
                    }
                    ppppword = pppword;
                    pppword = ppword;
                    ppword = pword;
                    pword = word;
                    return count;
                }, {});
            }
            for (var key in wc) {
                wc2.push([key, wc[key]]);
            }
            wc2.sort(function (a, b) {
                a = a[1];
                b = b[1];
                //return a > b ? -1 : (a > b ? 1 : 0);
                return a > b ? -1 : 1;
            });
            return wc2;

        }
    }
}();