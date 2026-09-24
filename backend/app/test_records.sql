-- Тестовые записи, которые оставляет `npm run contract:check` (полный режим) на боевой базе.
-- Признаки: пользователи cc-*, заголовки «Проверка контракта …», «Проверка <run>», места «ТЕСТ…».
-- Демо-данные (demo = true из seed_data.json) не затрагиваются.
--
-- 1) ПРОСМОТР — выполнить целиком в SQL-консоли, ничего не меняет:
SELECT 'site' AS kind, id, place_name AS title, created_at FROM last_battle_sites
 WHERE demo IS NOT TRUE AND (place_name LIKE 'Проверка контракта %' OR place_name ILIKE 'ТЕСТ%')
UNION ALL SELECT 'subscription', id, user_key, NULL FROM subscriptions WHERE user_key LIKE 'cc-%'
UNION ALL SELECT 'notification', id, coalesce(user_key, user_id), created_at FROM notifications
 WHERE user_key LIKE 'cc-%' OR user_id LIKE 'cc-%' OR site_id IN (SELECT id FROM last_battle_sites
   WHERE demo IS NOT TRUE AND (place_name LIKE 'Проверка контракта %' OR place_name ILIKE 'ТЕСТ%'))
UNION ALL SELECT 'request', id, title, created_at FROM volunteer_requests
 WHERE demo IS NOT TRUE AND title LIKE 'Проверка контракта %'
UNION ALL SELECT 'request_join', id, user_key, created_at FROM volunteer_request_joins WHERE user_key LIKE 'cc-%'
UNION ALL SELECT 'story', id, title, created_at FROM archive_stories
 WHERE demo IS NOT TRUE AND author = 'Проверка' AND title LIKE 'Проверка %'
UNION ALL SELECT 'group_application', id, organization, created_at FROM group_applications
 WHERE demo IS NOT TRUE AND organization = 'Школа (проверка контракта)'
UNION ALL SELECT 'donation', id, user_key || ' ' || amount_rub, created_at FROM fundraiser_donations WHERE user_key LIKE 'cc-%'
UNION ALL SELECT 'trip_registration', id, user_key, created_at FROM trip_registrations WHERE user_key LIKE 'cc-%'
ORDER BY 1, 4;

-- 2) УДАЛЕНИЕ — только после просмотра списка. Счётчики демо-записей возвращаются назад.
-- @cleanup
BEGIN;
UPDATE fundraisers f SET collected_rub = f.collected_rub - d.total
  FROM (SELECT fundraiser_id, sum(amount_rub) AS total FROM fundraiser_donations
         WHERE user_key LIKE 'cc-%' GROUP BY fundraiser_id) d
 WHERE f.id = d.fundraiser_id;
DELETE FROM fundraiser_donations WHERE user_key LIKE 'cc-%';
UPDATE trips t SET spots_taken = greatest(0, t.spots_taken - r.n)
  FROM (SELECT trip_id, count(*) AS n FROM trip_registrations WHERE user_key LIKE 'cc-%' GROUP BY trip_id) r
 WHERE t.id = r.trip_id;
DELETE FROM trip_registrations WHERE user_key LIKE 'cc-%';
DELETE FROM volunteer_request_joins WHERE user_key LIKE 'cc-%';
DELETE FROM volunteer_requests WHERE demo IS NOT TRUE AND title LIKE 'Проверка контракта %';
DELETE FROM group_applications WHERE demo IS NOT TRUE AND organization = 'Школа (проверка контракта)';
DELETE FROM archive_stories WHERE demo IS NOT TRUE AND author = 'Проверка' AND title LIKE 'Проверка %';
DELETE FROM notifications WHERE user_key LIKE 'cc-%' OR user_id LIKE 'cc-%' OR site_id IN (
  SELECT id FROM last_battle_sites
   WHERE demo IS NOT TRUE AND (place_name LIKE 'Проверка контракта %' OR place_name ILIKE 'ТЕСТ%'));
DELETE FROM subscriptions WHERE user_key LIKE 'cc-%';
DELETE FROM last_battle_sites WHERE demo IS NOT TRUE AND (place_name LIKE 'Проверка контракта %' OR place_name ILIKE 'ТЕСТ%');
COMMIT;
