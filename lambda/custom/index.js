'use strict';
var Alexa = require("alexa-sdk");
var AWS = require("aws-sdk");
var Axios = require("axios");
var NewsAPI = require("newsapi");

// For detailed tutorial on how to making a Alexa skill,
// please visit us at http://alexa.design/build

function ssml_escape ( orig ) {
  return orig.replace('&', ' and ')
}
var kLastHeadline = 'lastHeadline';

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.dynamoDBTableName = 'NewsSkillSampleTable';
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        this.response.speak("ようこそリセニューへ。「アレクサ、リセニューでヘッドラインを教えて」と話してみてください");
        this.emit(':responseReady');
    },
    'GetHeadlineIntent': function () {
        this.emit('SayHeadline');
    },
    'GetDetailIntent': function () {
        this.emit('SayDetail');
    },
    'SayHeadline': function () {
        var self = this;
        var kms = new AWS.KMS({region: 'us-east-1'});
        var buf = new Buffer(process.env.API_KEY, 'base64');
        kms.decrypt({CiphertextBlob: buf }, function (err, data) {
            if (err) {
                //console.log("token string decrypt error: " + err);
                context.fail(err);
                self.response.speak('Hello WorldHatena!'+err)
                     .cardRenderer('hello world', 'hello world');
                self.emit(':responseReady');
            } else {
                var token = data.Plaintext.toString('ascii');
                //console.log('token string = ' + token);
              
                var newsapi = new NewsAPI(token);
                var category = '';
                switch (self.event.request.intent.slots.Category.value) {
                  case 'ビジネス':
                    category = 'business';
                    break;
                  case 'エンターテインメント':
                    category = 'entertainment';
                    break;
                  case '健康':
                    category = 'health';
                    break;
                  case '健康':
                    category = 'health';
                    break;
                  case 'サイエンス':
                    category = 'science';
                    break;
                  case 'スポーツ':
                    category = 'sports';
                    break;
                  case 'テクノロジー':
                    category = 'technology';
                    break;
                  default:
                    category = 'general';
                };
                newsapi.v2.topHeadlines({
                        country: 'jp',
                        category: category 
                }).then(function(response) {
                    var str = ''
                    var acc = []
                    for (var i = 0; i < response.articles.length; i++) {
                      var t = response.articles[i].title;
                      var d =  response.articles[i].description;
                      acc.push({title: t, desc: d});
                      str = str + response.articles[i].title.slice(0,20) + "。 ";
                    }
                    var escaped = ssml_escape(str);
                    self.attributes[kLastHeadline] = acc;
                    self.response.speak(response.articles.length+'件あります。'+escaped+'です。')
                         .cardRenderer('ヘッドライン', str);
                    self.emit(':responseReady');
                })

            }
        });
    },
    'SayDetail': function () {
        var self = this;
        var kms = new AWS.KMS({region: 'us-east-1'});
        var buf = new Buffer(process.env.API_KEY, 'base64');
        kms.decrypt({CiphertextBlob: buf }, function (err, data) {
            if (err) {
                //console.log("token string decrypt error: " + err);
                context.fail(err);
                self.response.speak('失敗しました。')
                     .cardRenderer('処理エラーのため失敗しました。');
                self.emit(':responseReady');
            } else {
                  var searchWord = self.event.request.intent.slots.SearchWord.value;
                  var rmWords = ['で', 'を', 'に', 'の', 'して', '開いて', '起動して', '実行して', 'スタートして', '呼び出して', '、',',','。','.',' '];
                  for (var i = 0; i < rmWords.length; i++) {
                    searchWord = searchWord.replace(rmWords[i],'');
                  }
                  self.attributes['searchWord'] = searchWord;
                  var hl = self.attributes[kLastHeadline];
                  for (var i = 0; i < hl.length; i++) {
                    if (hl[i].title.search(searchWord) > -1) {
                      self.response.speak(hl[i].desc+'です。')
                         .cardRenderer('詳細情報', hl[i].desc);
                      self.emit(':responseReady');
                      return;
                    }
                  }
                  self.response.speak('ヘッドラインにありませんでした。')
                     .cardRenderer('検索キーワード', searchWord);
                  self.emit(':responseReady');
             }
         });
    },
    'SessionEndedRequest' : function() {
        console.log('Session ended with reason: ' + this.event.request.reason);
    },
    'AMAZON.StopIntent' : function() {
        this.response.speak('ご利用ありがとうございました。このスキルは「ニュースエーピーアイドットオーグ」を使っています');
        this.emit(':responseReady');
    },
    'AMAZON.HelpIntent' : function() {
        this.response.speak("ニュースのヘッドラインが聞けます。「アレクサ、リセニューでヘッドラインを教えて」と話してみてください");
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent' : function() {
        this.response.speak('ご利用ありがとうございました。');
        this.emit(':responseReady');
    },
    'Unhandled' : function() {
        this.response.speak("すいません、よくわかりません。「アレクサ、リセニューでヘッドラインを教えて」と話してみてください");
    }
};
