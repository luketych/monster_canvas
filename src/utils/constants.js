/**
 * Default character data if no saved data exists
 */
const defaultCharacterData = [
  { id: 1, character: '🐉', x: 100, y: 100, size: 50, color: '#FF5733' },
  { id: 2, character: '👾', x: 300, y: 150, size: 50, color: '#33FF57' },
  { id: 3, character: '🦄', x: 200, y: 300, size: 50, color: '#3357FF' },
  { id: 4, character: '🦊', x: 400, y: 250, size: 50, color: '#FF33E9' },
  { id: 5, character: '🐙', x: 150, y: 200, size: 50, color: '#33FFF5' }
];

/**
 * Default shapes data if no saved data exists
 */
const defaultShapes = [
  { id: 1, type: 'circle', x: 150, y: 150, width: 80, height: 80, color: '#4287f5' },
  { id: 2, type: 'square', x: 300, y: 200, width: 70, height: 70, color: '#f542a7' },
  { id: 3, type: 'triangle', x: 450, y: 250, width: 80, height: 80, color: '#42f56f' }
];

/**
 * Shape types available for selection
 */
const shapeTypes = [
  { type: 'circle', name: 'Circle' },
  { type: 'square', name: 'Square' },
  { type: 'triangle', name: 'Triangle' }
];

/**
 * Unicode character sets for the palette
 */
const unicodeCharacters = {
  monsters: [
    '👾', '👹', '👺', '👻', '👽', '👿', '💀', '☠️', '🤖', '🐉', '🐲', '🦄', '🦕', '🦖'
  ],
  animals: [
    '🐙', '🦑', '🦀', '🦞', '🦐', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🦭', '🐊',
    '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃',
    '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈',
    '🐈‍⬛', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫',
    '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'
  ],
  fantasy: [
    '🧙', '🧙‍♀️', '🧙‍♂️', '🧚', '🧚‍♀️', '🧚‍♂️', '🧛', '🧛‍♀️', '🧛‍♂️', '🧜', '🧜‍♀️', '🧜‍♂️', '🧝', '🧝‍♀️',
    '🧝‍♂️', '🧞', '🧞‍♀️', '🧞‍♂️', '🧟', '🧟‍♀️', '🧟‍♂️', '🧌'
  ],
  faces: [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰',
    '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '😝', '🤑', '🤗',
    '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😶‍🌫️', '😏', '😒', '🙄', '😬', '😮‍💨',
    '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶',
    '🥴', '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️',
    '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
    '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️'
  ],
  symbols: [
    '♠️', '♥️', '♦️', '♣️', '🃏', '🀄', '🎴', '🎭', '🔮', '🪄', '🧿', '🪬', '🪩', '🔍',
    '🔎', '🪪', '🗿', '🛸', '🚀', '💫', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️',
    '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄',
    '🌬️', '💨', '💧', '💦', '☔', '☂️', '🌊', '🌫️'
  ]
};

module.exports = {
  defaultCharacterData,
  defaultShapes,
  shapeTypes,
  unicodeCharacters
};
