"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  CalendarDays,
  Clock3,
} from "lucide-react";
import styles from "./hero-screen-status.module.css";

type DeviceBattery = EventTarget & { level: number; charging: boolean };
type BatteryReading = { percent: number; charging: boolean };

function subscribeClock(callback: () => void) {
  const tick = () => {
    if (!document.hidden) callback();
  };
  const timer = window.setInterval(tick, 1000);
  document.addEventListener("visibilitychange", tick);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", tick);
  };
}
const readClock = () => Math.floor(Date.now() / 1000);
const serverClock = () => 0;

/** Device-local readings only: no server timezone, invented battery or storage. */
export default function HeroScreenStatus() {
  const seconds = useSyncExternalStore(subscribeClock, readClock, serverClock);
  const [battery, setBattery] = useState<BatteryReading | null>(null);
  useEffect(() => {
    const getBattery = (
      navigator as Navigator & { getBattery?: () => Promise<DeviceBattery> }
    ).getBattery;
    if (!getBattery) return;
    let active = true;
    let manager: DeviceBattery | undefined;
    const update = () => {
      if (!active || !manager) return;
      const { level, charging } = manager;
      if (!Number.isFinite(level) || level < 0 || level > 1) {
        setBattery(null);
        return;
      }
      const percent = Math.round(level * 100);
      setBattery((previous) =>
        previous?.percent === percent && previous.charging === charging
          ? previous
          : { percent, charging },
      );
    };
    void (async () => {
      try {
        const result = await getBattery.call(navigator);
        if (!active) return;
        manager = result;
        update();
        manager.addEventListener("levelchange", update);
        manager.addEventListener("chargingchange", update);
      } catch {
        /* Unsupported or blocked by the browser: leave the honest dash. */
      }
    })();
    return () => {
      active = false;
      manager?.removeEventListener("levelchange", update);
      manager?.removeEventListener("chargingchange", update);
    };
  }, []);

  const date = seconds ? new Date(seconds * 1000) : null;
  const dateText = date
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date)
    : "— — —";
  const weekday = date
    ? new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date)
    : "Local date";
  const timeText = date
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).format(date)
    : "—:—:—";
  const zone = date
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "Device time";
  const BatteryIcon = battery?.charging
    ? BatteryCharging
    : !battery
      ? Battery
      : battery.percent <= 20
        ? BatteryLow
        : battery.percent <= 60
          ? BatteryMedium
          : BatteryFull;
  const batteryLabel = battery
    ? `${battery.percent}% battery, ${battery.charging ? "charging" : "not charging"}`
    : "Battery status unavailable in this browser";

  return (
    <div
      className={styles.bar}
      role="group"
      aria-label="Live device date, time and battery"
      data-laptop-status
    >
      <div className={styles.dateGroup}>
        <span className={styles.calendar} aria-hidden="true">
          <CalendarDays />
        </span>
        <span className={styles.weekday} data-device-weekday>
          {weekday}
        </span>
        <span className={styles.divider} aria-hidden="true" />
        <time
          dateTime={
            date
              ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
              : undefined
          }
          data-device-date
        >
          {dateText}
        </time>
      </div>
      <div className={styles.readings}>
        <span className={styles.time} title={`Device time · ${zone}`}>
          <Clock3 aria-hidden="true" />
          <time dateTime={date?.toISOString()} data-device-time>
            {timeText}
          </time>
        </span>
        <span
          className={styles.battery}
          role="group"
          aria-label={batteryLabel}
          title={batteryLabel}
          data-device-battery={
            battery
              ? battery.charging
                ? "charging"
                : "discharging"
              : "unavailable"
          }
          data-low={Boolean(battery && battery.percent <= 20)}
        >
          <BatteryIcon aria-hidden="true" />
          <span>{battery ? `${battery.percent}%` : "—"}</span>
        </span>
      </div>
    </div>
  );
}
