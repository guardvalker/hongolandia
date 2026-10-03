// Animaciones del honguito: assets/honguito_sheet.png es una tira horizontal de
// fotogramas de fw x fh. Cada animación lista sus índices de fotograma.
export const ANIM = {
  "fw": 60,
  "fh": 76,
  "anims": {
    "idle": {
      "frames": [
        0,
        1,
        2,
        3
      ],
      "fps": 3.2,
      "loop": true
    },
    "blink": {
      "frames": [
        4
      ],
      "fps": 1,
      "loop": true
    },
    "walk": {
      "frames": [
        5,
        6,
        7,
        8,
        9,
        10
      ],
      "fps": 11,
      "loop": true
    },
    "salto": {
      "frames": [
        11,
        12,
        13,
        14,
        15,
        16
      ],
      "fps": 12,
      "loop": false
    },
    "dar": {
      "frames": [
        17,
        18
      ],
      "fps": 3.2,
      "loop": true
    }
  }
};
