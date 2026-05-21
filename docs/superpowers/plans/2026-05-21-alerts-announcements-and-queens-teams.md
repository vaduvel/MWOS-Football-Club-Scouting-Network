# Alerts Announcements And Queens Teams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing Queens teams to the club data model and turn the Alerts workspace into a real internal announcements feed plus the existing operational notifications inbox.

**Architecture:** Extend the Supabase schema with two new team seeds plus a small announcements subsystem built around a `club_announcements` table and per-user read tracking. Keep the existing `/notifications` route, but evolve it into an Alerts workspace that merges announcement cards and operational notifications into one mobile-first feed, with a lightweight composer for admin and technical director accounts.

**Tech Stack:** Supabase Postgres + RLS, React, TypeScript, Vite, Vitest, Tailwind.

---
