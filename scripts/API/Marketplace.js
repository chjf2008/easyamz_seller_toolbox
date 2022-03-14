API.Marketplace = function () {


    var market = '';


    return {


        init: function (url) {
            var uri = new URL(url);
            switch (uri.hostname) {
                case "www.amazon.ae":
                    market = {"currency": "AED", "currency_sign": "د.إ", "country_code": "AE"};
                    break;
                case "www.amazon.de":
                    market = {"currency_code": "EUR", "currency_sign": "€", "country_code": "DE"};
                    break;
                case "www.amazon.co.uk":
                    market = {"currency_code": "GBP", "currency_sign": "£", "country_code": "GB"};
                    break;
                case "www.amazon.com":
                    market = {"currency_code": "USD", "currency_sign": "$", "country_code": "US"};
                    break;
                case "www.amazon.in":
                    market = {"currency_code": "INR", "currency_sign": "&#x20B9;", "country_code": "IN"};
                    break;
                case "www.amazon.it":
                    market = {"currency_code": "EUR", "currency_sign": "€", "country_code": "IT"};
                    break;
                case "www.amazon.ca":
                    market = {"currency_code": "CAD", "currency_sign": "$", "country_code": "CA"};
                    break;
                case "www.amazon.fr":
                    market = {"currency_code": "EUR", "currency_sign": "€", "country_code": "FR"};
                    break;
                case "www.amazon.com.au":
                    market = {"currency_code": "AUD", "currency_sign": "$", "country_code": "AU"};
                    break;
                case "www.amazon.es":
                    market = {"currency_code": "EUR", "currency_sign": "€", "country_code": "ES"};
                    break;
                case "www.amazon.co.jp":
                    market = {"currency_code": "YEN", "currency_sign": "¥", "country_code": "JP"};
                    break;
                case "www.amazon.sa":
                    market = {"currency_code": "SR", "currency_sign": "﷼", "country_code": "SA"};
                    break;
                case "www.amazon.com.tr":
                    market = {"currency_code": "TRY", "currency_sign": "₺", "country_code": "TR"};
                    break;
                case "www.amazon.com.br":
                    market = {"currency_code": "BRL", "currency_sign": "R$", "country_code": "BR"};
                    break;
                case "www.amazon.sg":
                    market = {"currency_code": "SGD", "currency_sign": "S$", "country_code": "SG"};
                    break;
                case "www.amazon.com.mx":
                    market = {"currency_code": "MXP", "currency_sign": "$", "country_code": "MX"};
                    break;
                default:
                    market = {"currency_code": "USD", "currency_sign": "$", "country_code": "US"};
                    break;
            }
        },
        get: function () {
            return market;

        }
    };


}();