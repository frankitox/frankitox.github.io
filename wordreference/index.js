// String -> Audio | String
function audioFromWord(word) {
  if (!_.isString(word)) {
    throw new Error('audioFromWord bad param');
  }
  return $
    .get(`http://www.wordreference.com/definition/${word}`)
    .then((html) => {
      const noImgHtml = _.replace(/<img[^\/>]*/gi, '', html);
      const sourceRegExp = /<source src='([^>]*)'>/gi;
      const sourcesTags = noImgHtml.match(sourceRegExp);
      if (_.isNull(sourcesTags)) {
        return `No sources found for ${word}`;
      }
      const sources = _.map((sourceTag) => sourceTag.match(/src='([^']*)'/)[1],
        sourcesTags);
      const ukRelativeUrl = _.find((source) => _.contains('uk/general', source), sources);
      if (ukRelativeUrl === undefined) {
        return `No uk/general audio found`;
      }
      return new Audio(`http://www.wordreference.com${ukRelativeUrl}`);
    })
  ;
}

function playWords(words) {
  if (words.length === 0) return;

  const [word, moreWords] = _.deCons(words);
  audioFromWord(word)
    .then((audio) => {
      console.assert(_.isString(audio) || audio instanceof Audio, 'Bad parameters');
      if (_.isString(audio)) {
        console.warn(`The word ${word} wasn't found`);
        playWords(moreWords);
      } else {
        $(audio).on('ended', () => {
          playWords(moreWords);
        });
        audio.play();
      }
    });
}

const Words = (() => {
  return {
    // TODO: Move this to private.
    storedWords: {},

    getWord(word) {
      console.assert(
        storedWords[word] !== undefined,
        'The word\'s not stored');

      return storedWords[word].promise();
    },

    // string -> void
    storeWord(word) {
      if (this.storedWords[word] !== undefined)
        return;

      const downloadDeferred = $.Deferred();
      $.get(`http://www.wordreference.com/definition/${word}`)
       .done((html) => {
         const noImgHtml = _.replace(/<img[^\/>]*/gi, '', html);
         const sourceRegExp = /<source src='([^>]*)'>/gi;
         const sourcesTags = noImgHtml.match(sourceRegExp);
         if (_.isNull(sourcesTags)) {
           console.warn(`No sources found for ${word}`);
           downloadDeferred.reject(`No sources found for ${word}`);
         }
         const sources = _.map((sourceTag) => sourceTag.match(/src='([^']*)'/)[1],
           sourcesTags);
         const ukRelativeUrl = _.find((source) => _.contains('uk/general', source), sources);
         if (ukRelativeUrl === undefined) {
           return `No uk/general audio found`;
           console.warn(`No uk/general audio found`);
           downloadDeferred.reject(`No uk/general audio found`);
         }
         const audio = new Audio(
           `http://www.wordreference.com${ukRelativeUrl}`);
         downloadDeferred.resolve(audio);
       });
      this.storedWords[word] = downloadDeferred;
      return downloadDeferred.promise();
    },

    // string[] -> void
    storeWords(words) {
      _.forEach((word) => {
        this.storeWord(word);
      }, words);
    },
  };
})();

const Talker = (() => {
  const publicObject = {};

  let currentSpokenWord; /* : $.Deferred */

  /* private */ function recursiveSay(words, everyWordSaid) {
    if (words.length === 0) {
      everyWordSaid.resolve();
    } else {
      const word = Words.getWord(_.head(words));
      const wordsLeft = _.tail(words);
      word.done((audio) => {
        $(audio).on('ended', () => {
          
        });
        audio.play();
      }).fail(() => {
        
      });
    }
  }

  publicObject.say = function say(words) {
    const alreadyTalking = currentSpokenWord !== undefined;
    if (alreadyTalking) {
      return undefined;
    }

    const everyWordSaid = $.Deferred();
    if (words.length === 0) {
      everyWordSaid.resolve();
    } else {
      currentSpokenWord = $.Deferred();
      recursiveSay(words, everyWordSaid);
    }
    return everyWordSaid.promise();
  };

  publicObject.stop = function stop() {
    
  };

  return publicObject;
})();

const App = (() => {
  let sayButton;
  let iframe;

  // Note that `.data` doesn't really modify the
  // data-toggled-text HTML attribute
  /* private */ function toggleSayButton() {
    const toggledText =
      sayButton.data('toggled-text');
    sayButton.data('toggled-text', sayButton.text())
    sayButton.html(toggledText);
  }

  /* private */ function initialization() {
    sayButton = $('button');
    sayButton.on('click', toggleSayButton.bind(this));
    iframe = $('iframe');
    iframe.get(0).contentDocument.designMode = 'on';
  }

  /* private */ function loop() {
    setInterval(checkText.bind(this), 500);
  }

  /* private */ function checkText() {
    const words = getWords.bind(this)();
    Words.storeWords(words);
  }

  /* private */ function getWords() {
    const text =
      $(iframe.get(0).contentWindow.document)
        .find('body').text();
    return _.words(_.lowerCase(text));
  }

  return {
    start() {
      initialization.bind(this)();
      loop.bind(this)();
    },
    talk() {
      const words = getWords.bind(this);
    },

    currentPromise: undefined,
    currentTalkedWord(words) {
      if (words.length === 0) {
        // TODO: Reset button.
        return;
      }
      const promisedWord =
        Words.getWord(_.head(words));
    },
  };
})();

$(document).ready(() => {
  const iframe = $('iframe').get(0);
  $(iframe).on('load', App.start.bind(App));
});
