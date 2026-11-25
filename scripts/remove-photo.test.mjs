import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRemovePhotoArgs } from './remove-photo.mjs';

describe('parseRemovePhotoArgs', () => {
  it('reads the handle and the photo, on the production database by default', () => {
    assert.deepEqual(parseRemovePhotoArgs(['--', '--handle', 'lea', '--photo', 'avatar']), {
      handle: 'lea',
      photo: 'avatar',
      database: 'moviepicker',
    });
  });

  it('accepts the handle as the report e-mail writes it, with its at sign and any case', () => {
    assert.equal(parseRemovePhotoArgs(['--handle', ' @Lea ', '--photo', 'banner']).handle, 'lea');
  });

  it('takes another database', () => {
    assert.equal(
      parseRemovePhotoArgs(['--handle', 'lea', '--photo', 'banner', '--db', 'moviepicker_dev'])
        .database,
      'moviepicker_dev'
    );
  });

  it('refuses a call without a handle', () => {
    assert.throws(() => parseRemovePhotoArgs(['--photo', 'avatar']), /--handle/);
  });

  it('refuses a photo that is neither the avatar nor the banner', () => {
    assert.throws(
      () => parseRemovePhotoArgs(['--handle', 'lea', '--photo', 'cover']),
      /--photo expects avatar or banner/
    );
    assert.throws(() => parseRemovePhotoArgs(['--handle', 'lea']), /--photo/);
  });

  it('refuses an unknown argument', () => {
    assert.throws(
      () => parseRemovePhotoArgs(['--handle', 'lea', '--photo', 'avatar', '--force']),
      /Unknown argument --force/
    );
  });
});
