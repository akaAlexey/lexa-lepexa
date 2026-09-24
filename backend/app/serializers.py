"""Строки базы → JSON в форме контракта фронта (camelCase, даты ISO, без null там, где поле необязательное)."""

from . import models as m
from .timeutil import iso_z


def _drop_none(d: dict) -> dict:
    return {k: v for k, v in d.items() if v is not None}


def grave(x: m.Grave) -> dict:
    return {"id": x.id, "lat": x.lat, "lon": x.lon, "fullName": x.full_name, "unit": x.unit, "demo": x.demo}


def battle(x: m.Battle) -> dict:
    place = (
        {"name": x.place_name, "lat": x.lat, "lon": x.lon}
        if x.place_name and x.lat is not None and x.lon is not None
        else None
    )
    return _drop_none(
        {
            "id": x.id,
            "date": x.date.isoformat(),
            "text": x.text,
            "archiveUrl": x.archive_url,
            "place": place,
            "demo": x.demo,
        }
    )


def team(x: m.Team) -> dict:
    return {
        "id": x.id,
        "name": x.name,
        "region": x.region,
        "budgetGoalRub": x.budget_goal_rub,
        "budgetCollectedRub": x.budget_collected_rub,
        "foundThisMonth": x.found_this_month,
        "demo": x.demo,
    }


def trail_point(x: m.TrailPoint) -> dict:
    return {
        "id": x.id,
        "kind": x.kind,
        "title": x.title,
        "lat": x.lat,
        "lon": x.lon,
        "story": x.story,
        "task": x.task,
        "sources": x.sources,
    }


def route(x: m.TrailRoute, points: list[m.TrailPoint]) -> dict:
    return {
        "id": x.id,
        "title": x.title,
        "summary": x.summary,
        "lengthM": x.length_m,
        "durationMin": x.duration_min,
        "path": x.path,
        "points": [trail_point(p) for p in sorted(points, key=lambda p: p.position)],
        "demo": x.demo,
    }


def volunteer_request(x: m.VolunteerRequest) -> dict:
    return _drop_none(
        {
            "id": x.id,
            "teamId": x.team_id,
            "title": x.title,
            "date": x.date.isoformat(),
            "place": x.place,
            "roles": x.roles,
            "joined": x.joined,
            "fundraiserId": x.fundraiser_id,
            "createdAt": iso_z(x.created_at),
            "demo": x.demo,
        }
    )


def fundraiser(x: m.Fundraiser) -> dict:
    return {
        "id": x.id,
        "teamId": x.team_id,
        "purpose": x.purpose,
        "title": x.title,
        "goalRub": x.goal_rub,
        "collectedRub": x.collected_rub,
        "demo": x.demo,
    }


def trip(x: m.Trip) -> dict:
    return {
        "id": x.id,
        "teamId": x.team_id,
        "date": x.date.isoformat(),
        "title": x.title,
        "place": x.place,
        "lat": x.lat,
        "lon": x.lon,
        "spotsTotal": x.spots_total,
        "spotsTaken": x.spots_taken,
        "checklist": x.checklist,
        "demo": x.demo,
    }


def group_application(x: m.GroupApplication) -> dict:
    return {
        "id": x.id,
        "tripId": x.trip_id,
        "organization": x.organization,
        "contactName": x.contact_name,
        "contact": x.contact,
        "peopleCount": x.people_count,
        "comment": x.comment,
        "status": x.status,
        "createdAt": iso_z(x.created_at),
        "demo": x.demo,
    }


def story(x: m.ArchiveStory) -> dict:
    return _drop_none(
        {
            "id": x.id,
            "title": x.title,
            "place": x.place,
            "story": x.story,
            "sourceText": x.source_text,
            "author": x.author,
            "status": x.status,
            "verifiedBy": x.verified_by,
            "reviewNote": x.review_note,
            "createdAt": iso_z(x.created_at),
            "demo": x.demo,
        }
    )


def site(x: m.Site) -> dict:
    return _drop_none(
        {
            "id": x.id,
            "lat": x.lat,
            "lon": x.lon,
            "placeName": x.place_name,
            "fightersCount": x.fighters_count,
            "fighters": x.fighters,
            "unit": x.unit,
            "dateText": x.date_text,
            "circumstances": x.circumstances,
            "status": x.status,
            # Старые записи могли сохранить "url": null — чистим и при выдаче.
            "sources": [_drop_none(s) for s in x.sources],
            "teamId": x.team_id,
            "volunteersReady": x.volunteers_ready,
            "createdAt": iso_z(x.created_at),
            "demo": x.demo,
        }
    )


def notification(x: m.Notification) -> dict:
    return {
        "id": x.id,
        "kind": x.kind,
        "siteId": x.site_id,
        "distanceKm": x.distance_km,
        "title": x.title,
        "body": x.body,
        "createdAt": iso_z(x.created_at),
    }
