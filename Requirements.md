Create a web-app that uses Google Photos API to help the user manage their
photos.

0. The user should be able to login using Google login.

1. The app should allow the user to create and rename photo albums in Google
   Photos.

2. The UI should list albums on the left side, and one photo (target photo) on
   the right side.

3. The target-photo on the right side is sourced from the list of all the photos in
   Google Photos, in chronological order.

3.1. By default, the chronological order should be most-recent photos first.

3.2. The user can navigate to the previous or next photo using the left or right
     arrows, respectively.

4. Each album in the left pane has a _unique_ letter of alphabet associated with it.

4.1. The letter associated with an album is derived from the name of the album.

  For example, if the name of the album is 'Family', then associate the letter
  'F'; 'Maple' => 'M'; Office => 'F'; 'London Trip' => 'L'; 'Love' => 'V'; 'Baby'
  => 'B'; 'Baby Shower' => 'S'; etc.

4.2. The letter associated with an album is listed to the left of the name of
     the album.

5. When the user presses a key associated with an album, the target-photo is
   added to that album.

5.1. A photo can be associated with more than one album.

5.2. All the albums that the target-photo is part of, show a green check-mark.


6. If the target-photo is already part of one of the photo albums, pressing the
   key associated with that album removes the target-photo from that album, and
   removes the green-check from that album.

Use TypeScript for this project. Writes tests to make sure that the above listed
features are all implemented.

