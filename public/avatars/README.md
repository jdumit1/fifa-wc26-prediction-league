# Player avatar images

Drop image files here to use them as player avatars instead of an emoji.

- Reference them by path: a file `emilio.png` here is served at `/avatars/emilio.png`.
- Square images work best (they're cropped to a circle). ~256×256 is plenty.
- Point a player at one with the admin tool:

  ```
  node tools/set-avatar.mjs <username> /avatars/<file>.png
  ```

Allowed extensions: png, jpg/jpeg, webp, gif, svg.
