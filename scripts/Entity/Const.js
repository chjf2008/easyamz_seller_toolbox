const re_float = /^\d+(\.\d+)?$/;
const re_int = /^\d+$/;

const loading_gif = "//" + chrome.runtime.id + "/images/loading.gif";

const re_date_ca = /([a-zA-Z.]+)\s(\d{1,2})\s(20\d{2})/;
const re_date_de = /(\d{1,2}\.)\s([a-zA-Zäöüß]+)\s(20\d{2})/;
const re_date_fr = /(\d{1,2})\s([a-zA-Zàâçéèêëîïôœùû]+)\s(20\d{2})/;
const re_date_it = /(\d{1,2})\s([a-zA-Zàéèíìóòúù]+)\s(20\d{2})/;
const re_date_us = /([a-zA-Z.]+)\s(\d{1,2}),\s(20\d{2})/;
const re_date_jp = /(20\d{2})\/(\d{1,2})\/(\d{1,2})/;
const re_date_jp_r = /(20\d{2})年(\d{1,2})月(\d{1,2})日/;
const re_date_es = /(\d{1,2})\sde\s([a-zA-Z]+)\sde\s(20\d{2})/; // # 6 de agosto de 2013
const re_date_ae = /(\d+)\s([\u0600-\u06FF\uFB8A\u067E\u0686\u06AF]+)\s(\d{1,2})/;
const re_date_other = /(\d{1,2})\s([a-zA-Z.]+)\s(20\d{2})/;  //17 April 2019 or  17 Aug. 2016


String.prototype.format = function () {
    var values = arguments;
    return this.replace(/\{(\d+)\}/g, function (match, index) {
        if (values.length > index) {
            return values[index];
        } else {
            return "";
        }
    });
};


function lazy_load() {
    $("img.lazy").lazyload({
        threshold: 200,
        effect: 'fadeIn',
        placeholder: loading_gif
    }).popover({
        html: true,
        trigger: 'hover',
        boundary: 'window',
        placement: 'bottom',
        content: function () {
            return '<img src="' + $(this).data("original") + '" />';
        }
    });

}


const Country_Maping = {
    "AE": "阿拉伯联合酋长国", "AF": "阿富汗", "AL": "阿尔巴尼亚", "AM": "亚美尼亚", "AO": "安哥拉", "AR": "阿根廷", "AT": "奥地利",
    "AU": "澳大利亚", "AZ": "阿塞拜疆", "BD": "孟加拉国", "BE": "比利时", "BG": "保加利亚", "BL": "巴勒斯坦", "BN": "文莱",
    "BO": "玻利维亚", "BR": "巴西", "BS": "巴哈马", "CA": "加拿大", "CF": "中非", "CH": "瑞士", "CL": "智利", "CM": "喀麦隆",
    "CN": "中国", "CO": "哥伦比亚", "CS": "捷克", "CU": "古巴", "CY": "塞浦路斯", "CZ": "捷克", "DE": "德国", "DK": "丹麦",
    "DZ": "阿尔及利亚", "EC": "厄瓜多尔", "EE": "爱沙尼亚", "EG": "埃及", "ES": "西班牙", "ET": "埃塞俄比亚", "FI": "芬兰",
    "FR": "法国", "GB": "英国", "GE": "格鲁吉亚", "GR": "希腊", "HK": "中国香港", "HN": "洪都拉斯", "HT": "海地", "HU": "匈牙利",
    "ID": "印度尼西亚", "IE": "爱尔兰", "IL": "以色列", "IN": "印度", "IQ": "伊拉克", "IR": "伊朗", "IS": "冰岛", "IT": "意大利",
    "JO": "约旦", "JP": "日本", "KE": "肯尼亚", "KG": "吉尔吉斯坦", "KH": "柬埔寨", "KP": "朝鲜", "KR": "韩国", "KW": "科威特",
    "KZ": "哈萨克斯坦", "LA": "老挝", "LB": "黎巴嫩", "LR": "利比里亚", "LT": "立陶宛", "LU": "卢森堡", "LV": "拉脱维亚",
    "LY": "利比亚", "MA": "摩洛哥", "MC": "摩纳哥", "MM": "缅甸", "MN": "蒙古", "MO": "中国澳门", "MT": "马耳他",
    "MU": "毛里求斯", "MV": "马尔代夫", "MW": "马拉维", "MX": "墨西哥", "MY": "马来西亚", "NA": "纳米比亚", "NE": "尼日尔",
    "NG": "尼日利亚", "NL": "荷兰", "NO": "挪威", "NP": "尼泊尔", "NR": "瑙鲁", "NZ": "新西兰", "PA": "巴拿马", "PE": "秘鲁",
    "PH": "菲律宾", "PK": "巴基斯坦", "PL": "波兰", "PR": "波多黎各", "PT": "葡萄牙", "PY": "巴拉圭", "QA": "卡塔尔",
    "RO": "罗马尼亚", "RU": "俄罗斯", "SA": "沙特阿拉伯", "SD": "苏丹", "SE": "瑞典", "SG": "新加坡", "SI": "斯洛文尼亚",
    "SK": "斯洛伐克", "SN": "塞内加尔", "SY": "叙利亚", "TH": "泰国", "TJ": "塔吉克斯坦", "TM": "土库曼斯坦", "TR": "土耳其",
    "TW": "中国台湾省", "TZ": "坦桑尼亚", "UA": "乌克兰", "UG": "乌干达", "US": "美国", "UY": "乌拉圭", "UZ": "乌兹别克斯坦",
    "VE": "委内瑞拉", "VN": "越南", "YE": "也门", "YU": "南斯拉夫", "ZA": "南非", "ZM": "赞比亚", "ZR": "扎伊尔",
    "ZW": "津巴布韦"
};



const Country_Region_Code = ["AO", "AF", "AL", "DZ", "AD", "AI", "AG", "AR", "AM", "AT", "AZ", "BS", "BH", "BD", "BB", "BY",
                       "BE", "BZ", "BJ", "BM", "BO", "BW", "BR", "BN", "BG", "BF", "MM", "BI", "CM", "CA", "CF", "CL",
                       "CN", "CO", "CG", "CK", "CR", "CU", "CY", "CZ", "DK", "DJ", "DO", "EC", "EG", "SV", "EE", "ET",
                       "FJ", "FI", "FR", "GF", "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GD", "GU", "GT", "GN", "GY",
                       "HT", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IL", "IT", "JM", "JP", "KH", "KZ",
                       "KE", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MO", "MG", "MW",
                       "MY", "MV", "ML", "MT", "MU", "MX", "MD", "MC", "MN", "MS", "MA", "MZ", "NA", "NR", "NP", "NL",
                       "NZ", "NI", "NE", "NG", "KP", "NO", "OM", "PK", "PA", "PG", "PY", "PE", "PH", "PL", "PF", "PT",
                       "PR", "QA", "RO", "RU", "LC", "VC", "SM", "ST", "SA", "SN", "SC", "SL", "SG", "SK", "SI", "SB",
                       "SO", "ZA", "ES", "LK", "LC", "VC", "SD", "SR", "SZ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH",
                       "TG", "TO", "TT", "TN", "TR", "TM", "UG", "UA", "AE", "GB", "US", "UY", "UZ", "VE", "VN", "YE",
                       "YU", "ZW", "ZR", "ZM"];

var CONST = {

    "loading_gif": loading_gif,
    "login_url": '/pages/login.html',
    "home_url": '/pages/home.html',
    "MARKETPLACE_ZIPCODE_MAPPING": {
        'GB': {"key": ['W5 5SA', 'EC2R 8AY', 'L1 0AF']},
        'US': {"key": ['10016', '20001', '90001']},
        'DE': {"key": ['13597', '20095', '60306']},
        'FR': {"key": ["75020", '59650', '69000', '13000']},
        'IT': {"key": ['82015', '50010', '20019']},
        'ES': {"key": ['28001', '08001', '08040']},
        'CA': {"key": ['K0A 1K0', 'V5K 0A1', 'T2P 2M5']},
        'JP': {'key': ['100-0000', '530-0000', '450-0005']},
        'SG': {'key': ['330004', '339443', '339949']},
        'IN': {'key': ['110028', '500078']},
        'BR': {'key': ['18052-110', '05407-002', '03001-000']},
        'NL': {'key': [{'city': 'België'}, {'city': 'België'}]},
        'MX': {'key': ['44100', '64000']},
        'AU': {
            'key': [
                {'zipcode': '2000', 'city': 'HAYMARKET'},
                {'zipcode': '3000', 'city': 'MELBOURNE'},
                {'zipcode': '2601', 'city': 'CANBERRA'}
            ]
        },
        'SA': {
            'key': [
                {'cityName': ' المدينة المنورة', 'city': 'Al Madinah Al Munawwarah'},
                {'cityName': ' ينبع البحر', 'city': 'Yanbu'},
                {'cityName': 'حائل', 'city': 'Hail'}
            ]
        },
        'AE': {
            "key": [
                {"city": 'Sharjah'},
                {"city": 'Al Ain'},
                {"city": 'Dubai'}
            ]
        }
    },
    'rank_split': [/\sin\s/, " en ", "位", "في"],
    "re_float": /^\d+(\.\d+)?$/,
    'chinese_character': /[\u4e00-\u9fa5]+/g,
    're_script': /<script([\S\s]*?)>([\S\s]*?)<\/script>/ig,
    're_style': /(<style([\s\S]+?)<\/style>)/ig,
    "re_int": /^\d+$/,
    "re_email": /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    "re_url": /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/,

    "re_date_ca": re_date_ca,
    "re_date_de": re_date_de,
    "re_date_fr": re_date_fr,
    "re_date_it": re_date_it,
    "re_date_us": re_date_us,
    "re_date_jp": re_date_jp,
    "re_date_jp_r": re_date_jp_r,
    "re_date_es": re_date_es, // # 6 de agosto de 2013
    "re_date_ae": re_date_ae,
    "re_date_other": re_date_other,  //17 April 2019 or  17 Aug. 2016
    "re_date_arr": [re_date_ca, re_date_de, re_date_fr,
        re_date_it, re_date_us, re_date_jp, re_date_jp_r, re_date_es, re_date_ae, re_date_other],
    "re_product_size_weight": /([0-9.,]+\sx\s){2}[0-9.,]+\s(inches|cm|mm)\s;\s([0-9.,]+\s(pounds|ounces|kg|g))?/ig,
    "re_product_size": /([0-9.,]+\sx\s){2}[0-9.,]+\s(inches|cm|mm)/ig, // 14 x 4 x 0.8 inches
    "re_product_weight": /[0-9.,]+\s(pounds|ounces|kg|g)/ig,
    "spliter": [" in ", " en ", "-", "في", "商品里排第"],
    "DATA_TRANSLATOR": {

        "Jan.": "01",
        "January": "01",
        "Feb.": "02",
        "February": "02",
        "Mar.": "03",
        "March": "03",
        "Apr.": "04",
        "May": "05",
        "Jun.": "06",
        "June": "06",
        "Jul.": "07",
        "July": "07",
        "Aug.": "08",
        "August": "08",
        "Sept.": "09",
        "Oct.": "10",
        "October": "10",
        "Nov.": "11",
        "Dec.": "12",
        "December": "12",


        "Januar": "01",
        "Februar": "02",
        "März": "03",
        "April": "04",
        "Mai": "05",
        "Juni": "06",
        "Juli": "07",
        "September": "09",
        "Oktober": "10",
        "November": "11",
        "Dezember": "12",

        "janvier": "01",
        "février": "02",
        "mars": "03",
        "avril": "04",
        "mai": "05",
        "juin": "06",
        "juillet": "07",
        "août": "08",
        "septembre": "09",
        "octobre": "10",
        "décembre": "12",
        "enero": "01",
        "febrero": "02",
        "abril": "04",
        "mayo": "05",
        "junio": "06",
        "julio": "07",
        "septiembre": "09",
        "octubre": "10",
        "noviembre": "11",
        "diciembre": "12",
        "gennaio": "01",
        "febbraio": "02",
        "marzo": "03",
        "aprile": "04",
        "maggio": "05",
        "giugno": "06",
        "luglio": "07",
        "agosto": "08",
        "settembre": "09",
        "ottobre": "10",
        "novembre": "11",
        "dicembre": "12"
    },
    "marketplace_mapping": {
        "United States": 'US',
        "Vereinigten Staaten": 'US',
        "États-Unis": 'US',
        "Stati Uniti": 'US',
        'Estados Unidos': 'US',
        'アメリカ合衆国': 'US',
        'United Kingdom': 'UK',
        'Vereinigten Königreich': 'UK',
        'Royaume-Uni': 'UK',
        'Regno Unito': 'UK',
        'Reino Unido': 'UK',
        '英国': 'UK',
        'Germany': 'DE',
        'Germania': 'DE',
        'Allemagne': 'DE',
        'Germania': 'DE',
        'Alemania': 'DE',
        'ドイツ': 'DE',
        'France': 'FR',
        'Frankreich': 'FR',
        'Francia': 'FR',
        'フランス': 'FR',
        'Italy': 'IT',
        'Italien': 'IT',
        'Italie': 'IT',
        'Italia': 'IT',
        'Spain': 'ES',
        'Spanien': 'ES',
        'Espagne': 'ES',
        'Spagna': 'ES',
        'España': 'ES',
        'Japan': 'JP',
        'Giappone': 'JP',
        '日本': 'JP',
        'Japon': 'JP',
        'Japón': 'JP',
        'Japona': 'JP',
        'Canada': 'CA'


    },
    "datatables_lang": {
        "sProcessing": "处理中...",
        "sLengthMenu": "显示 _MENU_ 项搜索结果",
        "sZeroRecords": "没有匹配结果",
        "sInfo": "显示第_START_至_END_项结果，共_TOTAL_条记录",
        "sInfoEmpty": "显示第 0 至 0 项结果，共 0 项",
        "sInfoFiltered": "(由 _MAX_ 项结果过滤)",
        "sInfoPostFix": "",
        "sSearch": "搜索:",
        "sUrl": "",
        "sEmptyTable": "无数据",
        "sLoadingRecords": "载入中...",
        "sInfoThousands": ",",
        "oPaginate": {
            "sFirst": "首页",
            "sPrevious": "上页",
            "sNext": "下页",
            "sLast": "末页"
        },
        "oAria": {
            "sSortAscending": ": 以升序排列此列",
            "sSortDescending": ": 以降序排列此列"
        }
    },

    "iso_countries": [

        {
            "id": "ATVPDKIKX0DER",
            "countrycode": 'US',
            "text": '美国站',
            "domain": 'www.amazon.com'
        },
        {
            "id": "A13V1IB3VIYZZH",
            "countrycode": 'FR',
            "text": '法国站',
            "domain": 'www.amazon.fr'
        }, {
            "id": "A1F83G8C2ARO7P",
            "countrycode": 'GB',
            "text": '英国站',
            "domain": 'www.amazon.co.uk'
        }, {
            "id": "A1PA6795UKMFR9",
            "countrycode": 'DE',
            "text": '德国站',
            "domain": 'www.amazon.de'
        }, {
            "id": "A1RKKUPIHCS9HS",
            "countrycode": 'ES',
            "text": '西班牙站',
            "domain": 'www.amazon.es'
        }, {
            "id": "APJ6JRA9NG5V4",
            "countrycode": 'IT',
            "text": '意大利站',
            "domain": 'www.amazon.it'
        }, {
            "id": "A21TJRUUN4KGV",
            "countrycode": 'IN',
            "text": '印度站',
            "domain": 'www.amazon.in'
        }, {
            "id": "A2EUQ1WTGCTBG2",
            "countrycode": 'CA',
            "text": '加拿大站',
            "domain": 'www.amazon.ca'
        }, {
            "id": "A2Q3Y263D00KWC",
            "countrycode": 'BR',
            "text": '巴西站',
            "domain": 'www.amazon.com.br'
        }, {
            "id": "A33AVAJ2PDY3EV",
            "countrycode": 'TR',
            "text": '土耳其站',
            "domain": 'www.amazon.com.tr'
        }, {
            "id": "A19VAU5U5O7RUS",
            "countrycode": 'SG',
            "text": '新加坡站',
            "domain": 'www.amazon.sg'
        }, {
            "id": "A1AM78C64UM0Y8",
            "countrycode": 'MX',
            "text": '墨西哥站',
            "domain": 'www.amazon.com.mx'
        }, {
            "id": "A39IBJ37TRP1C6",
            "countrycode": 'AU',
            "text": '澳大利亚站',
            "domain": 'www.amazon.com.au'
        }, {
            "id": "A2VIGQ35RCS4UG",
            "countrycode": 'AE',
            "text": '阿拉伯酋长国站',
            "domain": 'www.amazon.ae'
        }, {
            "id": "A1VC38T7YXB528",
            "countrycode": 'JP',
            "text": '日本站',
            "domain": 'www.amazon.co.jp'
        }],
    "country_codes_mapping": {
        "AE": "阿拉伯联合酋长国", "AF": "阿富汗", "AL": "阿尔巴尼亚", "AM": "亚美尼亚", "AO": "安哥拉", "AR": "阿根廷", "AT": "奥地利",
        "AU": "澳大利亚", "AZ": "阿塞拜疆", "BD": "孟加拉国", "BE": "比利时", "BG": "保加利亚", "BL": "巴勒斯坦", "BN": "文莱",
        "BO": "玻利维亚", "BR": "巴西", "BS": "巴哈马", "CA": "加拿大", "CF": "中非", "CH": "瑞士", "CL": "智利", "CM": "喀麦隆",
        "CN": "中国", "CO": "哥伦比亚", "CS": "捷克", "CU": "古巴", "CY": "塞浦路斯", "CZ": "捷克", "DE": "德国", "DK": "丹麦",
        "DZ": "阿尔及利亚", "EC": "厄瓜多尔", "EE": "爱沙尼亚", "EG": "埃及", "ES": "西班牙", "ET": "埃塞俄比亚", "FI": "芬兰",
        "FR": "法国", "GB": "英国", "GE": "格鲁吉亚", "GR": "希腊", "HK": "中国香港", "HN": "洪都拉斯", "HT": "海地", "HU": "匈牙利",
        "ID": "印度尼西亚", "IE": "爱尔兰", "IL": "以色列", "IN": "印度", "IQ": "伊拉克", "IR": "伊朗", "IS": "冰岛", "IT": "意大利",
        "JO": "约旦", "JP": "日本", "KE": "肯尼亚", "KG": "吉尔吉斯坦", "KH": "柬埔寨", "KP": "朝鲜", "KR": "韩国", "KW": "科威特",
        "KZ": "哈萨克斯坦", "LA": "老挝", "LB": "黎巴嫩", "LR": "利比里亚", "LT": "立陶宛", "LU": "卢森堡", "LV": "拉脱维亚",
        "LY": "利比亚", "MA": "摩洛哥", "MC": "摩纳哥", "MM": "缅甸", "MN": "蒙古", "MO": "中国澳门", "MT": "马耳他",
        "MU": "毛里求斯", "MV": "马尔代夫", "MW": "马拉维", "MX": "墨西哥", "MY": "马来西亚", "NA": "纳米比亚", "NE": "尼日尔",
        "NG": "尼日利亚", "NL": "荷兰", "NO": "挪威", "NP": "尼泊尔", "NR": "瑙鲁", "NZ": "新西兰", "PA": "巴拿马", "PE": "秘鲁",
        "PH": "菲律宾", "PK": "巴基斯坦", "PL": "波兰", "PR": "波多黎各", "PT": "葡萄牙", "PY": "巴拉圭", "QA": "卡塔尔",
        "RO": "罗马尼亚", "RU": "俄罗斯", "SA": "沙特阿拉伯", "SD": "苏丹", "SE": "瑞典", "SG": "新加坡", "SI": "斯洛文尼亚",
        "SK": "斯洛伐克", "SN": "塞内加尔", "SY": "叙利亚", "TH": "泰国", "TJ": "塔吉克斯坦", "TM": "土库曼斯坦", "TR": "土耳其",
        "TW": "中国台湾省", "TZ": "坦桑尼亚", "UA": "乌克兰", "UG": "乌干达", "US": "美国", "UY": "乌拉圭", "UZ": "乌兹别克斯坦",
        "VE": "委内瑞拉", "VN": "越南", "YE": "也门", "YU": "南斯拉夫", "ZA": "南非", "ZM": "赞比亚", "ZR": "扎伊尔",
        "ZW": "津巴布韦"
    },
    "country_codes": ["AO", "AF", "AL", "DZ", "AD", "AI", "AG", "AR", "AM", "AT", "AZ", "BS", "BH", "BD", "BB", "BY",
        "BE", "BZ", "BJ", "BM", "BO", "BW", "BR", "BN", "BG", "BF", "MM", "BI", "CM", "CA", "CF", "CL",
        "CN", "CO", "CG", "CK", "CR", "CU", "CY", "CZ", "DK", "DJ", "DO", "EC", "EG", "SV", "EE", "ET",
        "FJ", "FI", "FR", "GF", "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GD", "GU", "GT", "GN", "GY",
        "HT", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IL", "IT", "JM", "JP", "KH", "KZ",
        "KE", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MO", "MG", "MW",
        "MY", "MV", "ML", "MT", "MU", "MX", "MD", "MC", "MN", "MS", "MA", "MZ", "NA", "NR", "NP", "NL",
        "NZ", "NI", "NE", "NG", "KP", "NO", "OM", "PK", "PA", "PG", "PY", "PE", "PH", "PL", "PF", "PT",
        "PR", "QA", "RO", "RU", "LC", "VC", "SM", "ST", "SA", "SN", "SC", "SL", "SG", "SK", "SI", "SB",
        "SO", "ZA", "ES", "LK", "LC", "VC", "SD", "SR", "SZ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH",
        "TG", "TO", "TT", "TN", "TR", "TM", "UG", "UA", "AE", "GB", "US", "UY", "UZ", "VE", "VN", "YE",
        "YU", "ZW", "ZR", "ZM"],


    "eu_marketplaces": ['www.amazon.de', 'www.amazon.fr', 'www.amazon.it', 'www.amazon.es', 'www.amazon.nl', 'www.amazon.pl', 'www.amazon.com.tr'],


    'app_const': {
        "modules": {'key': '__MODULES__', 'url': '/v2/ext/modules/'},
        "competitor": {'key': "__ASION_COMPETITOR__", 'url': '/v2/ext/competitor/'},
        "listings": {'key': "__LISTINGS__", 'url': '/v2/ext/listings/'},
        "reviews": {'key': "__REVIEWS__", 'url': '/v2/ext/reviews/'},
        "qa": {'key': "__QA__", 'url': '/v2/ext/qa/'},
        "keywordsIndex": {'key': "__KEYWORDSINDEX__", 'url': '/v2/ext/keywordsIndex/'},
        "top100": {'key': "__TOP100__", 'url': '/v2/ext/top100/'},
        "create_sp_task": {'key': '__CREATE_SP_TASK__', 'url': '/v2/sponsored/tasks/create/'},
        "seller_request": {'key': '__SELLER_REQUEST__', 'url': '/v2/ext/seller-request/'},
        "refresh": {'key': '__USER_VERIFY__', 'url': '/v2/refresh/'},
        "login": {'key': '__LOGIN__', "url": '/v2/login/'},
        "logout": {'key': '__LOGOUT__', 'url': ''},
        "asincheck": {'key': '_ASIN_GLOBAL_CHECK_', 'url': '/v2/ext/asin-offer-checker/'},
        "query": {'key': '__USER_QUERY__', 'url': ''},
        "create_listings_task": {'key': '__CREATE_LISTINGS_TASK__', 'url': '/v2/listings/tasks/create/'},
        "append_listings_items": {'key': '__APPEND_LISTINGS_ITEMS__', 'url': '/v2/listings/tasks/items/append/'},
        "search_asin_keywords": {'key': '__SEARCH_ASIN_KEYWORDS__', 'url': '/v2/asin_keywords/search/'},
        "asin_keywords": {'key': '__ASIN_KEYWORDS__', 'url': '/v2/ext/asin_keywords/'},

        "bsr_tasks_submit": {'key': '__BSR_TASKS_SUBMIT__', 'url': '/v2/bestsellers/items/submit/'},

        "search_tasks_submit": {'key': '__SEARCH_TASKS_SUBMIT__', 'url': '/v2/search_tasks/items/submit/'},


        "download_bsr_task": {'key': '__DOWNLOAD_CLOUD_TASK__', 'url': '/v2/bestsellers/download/'},
        "download_items_from_cloud": {'key': '__DOWNLOAD_ITEMS_FROM_CLOUD__', 'url': '/v2/cloud/items/download/'},
        "asin_tasks_status": {'key': '__ASIN_TASKS_STATUS__', 'url': '/v2/tasks/status/'},
        "asin_display_tool": {'key': '__ASIN_DISPLAY_TOOL__', 'url': '/v2/ext/asin-display-tool/'},
        "tutorial": {'key': '__TUTORIAL__', 'url': '/v2/ext/tutorial/'},
    }
};




