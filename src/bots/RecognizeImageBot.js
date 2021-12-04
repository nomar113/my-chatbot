const { ActivityHandler, MessageFactory } = require('botbuilder');
const axios = require('axios');
const algorithmia = require('algorithmia');

class RecognizeImageBot extends ActivityHandler {
    constructor() {
        super();
        this.onMessage(async (context, next) => {
            console.log(context.activity.attachments);
            console.log(context.activity.attachments[0].name);

            if (context.activity.attachments && context.activity.attachments.length > 0) {
                var attachment = context.activity.attachments[0];

                await context.sendActivity(MessageFactory.attachment(attachment));
            }

            const response = await axios
                .get(context.activity.attachments[0].contentUrl, {
                    responseType: 'arraybuffer'
                });
            const base64Image = Buffer.from(response.data, 'binary').toString('base64');

            var input = {
                image: `data:image/png;base64,${ base64Image }`,
                numResults: 15
            };

            const algorithmiaAuthenticated = algorithmia(process.env.ALGORITHMIA_DEFAULT_API_KEY);

            const illustrationTaggerAlgorithm = algorithmiaAuthenticated.algo('deeplearning/IllustrationTagger/0.4.0?timeout=3000');
            // .pipe() is a promise
            const illustrationTaggerResponse = await illustrationTaggerAlgorithm.pipe(input);
            const illustrationTaggerContent = illustrationTaggerResponse.get();

            await context.sendActivity(MessageFactory.text(JSON.stringify(illustrationTaggerContent)));

            console.log(illustrationTaggerContent.general);
            const terms = [];

            illustrationTaggerContent.general.map((item) => {
                terms.push(Object.keys(item)[0]);
            });

            console.log(terms);

            const translate = await axios.post('https://api.us-south.language-translator.watson.cloud.ibm.com/instances/635c3c0f-f172-405e-8aab-6f7f56332d90/v3/translate?version=2018-05-01', {
                text: terms, model_id: 'en-pt'
            }, {
                'Content-Type': 'application/json',
                auth: {
                    username: 'apikey',
                    password: process.env.IBM_WATSON_API_KEY
                }
            });

            for (let i = 0; i < terms.length; i++) {
                await context.sendActivity(MessageFactory.text(translate.data.translations[i].translation + ' ' + Object.values(illustrationTaggerContent.general[i])[0] + '\n'));
            }

            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Envie uma imagem para análise!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            await next();
        });
    }
}

module.exports.RecognizeImageBot = RecognizeImageBot;
