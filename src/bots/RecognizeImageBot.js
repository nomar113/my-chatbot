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

            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome!';
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
