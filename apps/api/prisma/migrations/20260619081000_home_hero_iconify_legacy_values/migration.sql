UPDATE "home_hero_slides"
SET "eyebrowIcon" = CASE "eyebrowIcon"
  WHEN 'graduation' THEN 'fa6-solid:graduation-cap'
  WHEN 'users' THEN 'fa6-solid:users'
  WHEN 'calendar' THEN 'fa6-solid:calendar-days'
  WHEN 'badge' THEN 'fa6-solid:circle-check'
  WHEN 'book' THEN 'fa6-solid:book-open'
  WHEN 'handshake' THEN 'fa6-solid:handshake'
  WHEN 'star' THEN 'fa6-solid:star'
  WHEN 'landmark' THEN 'fa6-solid:landmark'
  WHEN 'sparkles' THEN 'fa6-solid:wand-magic-sparkles'
  ELSE "eyebrowIcon"
END
WHERE "eyebrowIcon" IN ('graduation', 'users', 'calendar', 'badge', 'book', 'handshake', 'star', 'landmark', 'sparkles');
