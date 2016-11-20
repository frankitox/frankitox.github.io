function splitMultiple(chars, string) {
  if (!_.isString(string) || !_.isArray(chars)) {
    throw new Error('Bad parameters for splitMultiple');
  }

  if (chars.length === 0) return [string];

  const firstSplit = _.split(_.head(chars), string);
  function fun(arr, c) {
    return _.flatMap(_.split(c), arr);
  }
  const reduced = _.reduce(
    (words, ch) => _.flatMap(_.split(ch), words),
    firstSplit,
    _.tail(chars)
  );
  return _.filter((elem) => !_.isEmpty(elem), reduced);
}

function deCons(array) {
  console.assert(_.isArray(array),
                 'Bad param for deCons');
  console.assert(array.length !== 0,
                 'The array must be non-empty');
  return [_.head(array), _.tail(array)];
}

_.mixin({
  'splitMultiple': splitMultiple,
  'deCons': deCons,
});

// Usage example:
// _.splitMultiple([" ", "\n", "\t"], "Hello everyone!\n\tMy name's Franco.")
// => ["Hello", "everyone!", "My", "name's", "Franco."]

var q = _.flatMap(["Hi\nman", "Other"], _.split('\n'));

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


$(document).ready(() => {
  $('button#say').on('click', (e) => {
    $('#messages').empty();
    const text = $('textarea#text-to-say').val();
    const words = _.words(text);
    playWords(words);
  });
});
