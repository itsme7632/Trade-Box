# TradeBox News Center — Build Audit
**Phase 6 | Date:** June 2026

---

## Overview

A full-featured platform news system has been implemented, replacing the simple "Announcements Channel" concept with a professional news center comparable to Binance/Bybit/KuCoin news feeds.

---

## Database Changes

### New Table: `news_posts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | Auto-increment |
| `title` | TEXT NOT NULL | Post headline |
| `summary` | TEXT | Short preview (max 500 chars) |
| `content` | TEXT | Full article body |
| `cover_image` | TEXT | URL to cover image |
| `category` | TEXT NOT NULL | See categories below |
| `author` | TEXT NOT NULL | Defaults to "TradeBox" |
| `is_pinned` | BOOLEAN | Appears at top of feed |
| `is_featured` | BOOLEAN | Shown in featured banner |
| `status` | TEXT | `draft` / `published` / `archived` |
| `published_at` | TIMESTAMPTZ | When post went live |
| `scheduled_at` | TIMESTAMPTZ | Future scheduled publish |
| `view_count` | INTEGER | Incremented per read |
| `created_by` | INTEGER | Admin user ID |
| `created_at` | TIMESTAMPTZ | Record creation time |
| `updated_at` | TIMESTAMPTZ | Auto-updated on change |

### Modified Table: `notifications`

Added `link TEXT` column — stores `/news/:id` path for news-triggered notifications so users can navigate directly to the article.

---

## Post Categories

| Value | Label |
|-------|-------|
| `platform_update` | Platform Update |
| `new_shipment` | New Shipment |
| `maintenance` | Maintenance Notice |
| `feature_release` | Feature Release |
| `security_alert` | Security Alert |
| `promotion` | Promotion |
| `partnership` | Partnership |
| `general` | General News |

---

## API Routes Added

### Public Routes — `/api/news`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/news` | All published posts (optional `?category=` filter) |
| GET | `/api/news/featured` | Featured posts (max 3) |
| GET | `/api/news/latest` | 3 most recent published posts |
| GET | `/api/news/:id` | Single published post by ID |
| POST | `/api/news/:id/view` | Increment view counter |

### Admin Routes — `/api/admin/news` (auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/news` | All posts (all statuses) |
| GET | `/api/admin/news/:id` | Single post |
| POST | `/api/admin/news` | Create new post |
| PATCH | `/api/admin/news/:id` | Edit post (partial update) |
| POST | `/api/admin/news/:id/duplicate` | Duplicate as draft copy |
| DELETE | `/api/admin/news/:id` | Archive post (soft delete) |

---

## Admin Tools

**File:** `artifacts/tradebox/src/pages/admin-news.tsx`  
**Access:** Admin panel → "News Center" tab

Features:
- ✅ Create post (all fields, including cover image URL, schedule, pin, feature)
- ✅ Edit existing post
- ✅ Publish immediately (one-click from draft list)
- ✅ Archive post (soft delete — data preserved)
- ✅ Duplicate post (creates draft copy with "(Copy)" title)
- ✅ Filter by status: All / Published / Draft / Archived
- ✅ View counts displayed per post
- ✅ Category + status badges
- ✅ Publish date display
- ✅ No post limit — all posts preserved historically

---

## User Pages

**File:** `artifacts/tradebox/src/pages/news.tsx`  
**Route:** `/news`

Features:
- ✅ Professional news feed layout (card grid, responsive)
- ✅ Featured story banner (highlighted at top)
- ✅ Pinned posts section
- ✅ Category filter tabs: All, Platform, Shipments, Maintenance, Features, Security, Promotions, Partnerships
- ✅ Live search (filters by title + summary)
- ✅ Article modal (full content with cover image, author, date, view count)
- ✅ View counter incremented on article open
- ✅ Mobile optimized — cards reflow to single column
- ✅ Shimmer skeleton loading states

---

## Notification Integration

When admin publishes a post (via POST or PATCH setting status to `published`):

1. System automatically inserts a notification row per registered user
2. Notification type: `news_post` (styled with blue Newspaper icon)
3. Title: `"TradeBox posted a new {category_label}"`
4. Link: `/news/{post_id}`
5. Socket event `notification:new` emitted to each user's room for real-time delivery
6. Bell badge in header updates instantly

**Notifications page** (`/notifications`) → "My Alerts" tab shows news notifications with "News" badge styling.

---

## Dashboard Integration

**File:** `artifacts/tradebox/src/pages/market.tsx`

A "Latest TradeBox News" section has been added at the bottom of the Market/Dashboard page:
- Shows 3 most recent published posts
- Color-coded category accent bar per card
- Time-ago display
- "View all" link → `/news`
- Hidden when no posts available (graceful empty state)

---

## Navigation

News Center is accessible from:
- ✅ Desktop sidebar (under "Guild") — "News" link with Newspaper icon
- ✅ Dashboard → "Latest TradeBox News" section + "View all" link
- ✅ Notification cards with `link` field navigate to `/news`

---

## Audit Events

All news operations are logged to the admin audit trail:

| Event | Trigger |
|-------|---------|
| `news_post_created` | New post created |
| `news_post_updated` | Post edited (tracks changed fields) |
| `news_post_duplicated` | Post duplicated |
| `news_post_archived` | Post archived |

---

## Mobile Testing Results

- News feed: Cards reflow from 3-column → 1-column on mobile ✅
- Category tabs: Horizontally scrollable, no overflow ✅
- Article modal: Bottom sheet on mobile, centered on desktop ✅
- Search bar: Full-width, touch-friendly ✅
- Admin post form: All inputs accessible, form scrollable ✅
- Dashboard news cards: Single column on mobile ✅
