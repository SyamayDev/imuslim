package io.github.syamaydev.imuslim.adzan;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import org.junit.Test;

/** Jadwal di native harus identik dengan aplikasi web (src/features/sholat/nativeEvents.test.js). */
public class ScheduleRefresherTest {

    private static String fixture() throws Exception {
        return new String(Files.readAllBytes(Paths.get("../../src/test/fixtures/myquran-jadwal-0105-2026-10.json")), StandardCharsets.UTF_8);
    }

    private static long utc(String iso) {
        return Instant.parse(iso).toEpochMilli();
    }

    private static AdzanStore.Event find(List<AdzanStore.Event> list, String date, String key) {
        for (AdzanStore.Event e : list) if (e.date.equals(date) && e.key.equals(key)) return e;
        throw new AssertionError(date + " " + key + " tidak ada");
    }

    @Test
    public void membacaJadwalBulananSepertiAplikasiWeb() throws Exception {
        List<AdzanStore.Event> ev = ScheduleRefresher.parseMonth(fixture(), "0105", 2026, 10, 7);
        assertEquals(31 * 6, ev.size());
        AdzanStore.Event ashar = find(ev, "2026-10-24", "ashar");
        assertEquals("15:37", ashar.time);
        assertEquals(utc("2026-10-24T08:37:00Z"), ashar.at); // 15:37 WIB
    }

    @Test
    public void zonaWitaDanWit() {
        assertEquals(utc("2026-10-24T07:37:00Z"), ScheduleRefresher.instantOf(2026, 10, 24, "15:37", 8));
        assertEquals(utc("2026-10-24T06:37:00Z"), ScheduleRefresher.instantOf(2026, 10, 24, "15:37", 9));
        assertEquals(utc("2026-12-31T21:30:00Z"), ScheduleRefresher.instantOf(2027, 1, 1, "04:30", 7));
    }

    @Test
    public void menolakKotaAtauBulanYangTidakCocok() {
        assertThrows(IllegalStateException.class, () -> ScheduleRefresher.parseMonth(fixture(), "0106", 2026, 10, 7));
        assertThrows(IllegalStateException.class, () -> ScheduleRefresher.parseMonth(fixture(), "0105", 2026, 11, 7));
        assertThrows(Exception.class, () -> ScheduleRefresher.parseMonth("{\"status\":false}", "0105", 2026, 10, 7));
    }

    @Test
    public void waktuBerikutnyaMengikutiPilihanAdzanDanImsak() throws Exception {
        AdzanStore.Config c = new AdzanStore.Config();
        c.enabled = true;
        c.adzan = true;
        c.imsak = false;
        long now = utc("2026-10-24T08:00:00Z"); // 15:00 WIB
        c.merge(ScheduleRefresher.parseMonth(fixture(), "0105", 2026, 10, 7), now);
        assertEquals("ashar", c.next(now).key);
        AdzanStore.Event isya = find(c.events, "2026-10-24", "isya");
        AdzanStore.Event after = c.next(isya.at);
        assertEquals("subuh", after.key); // imsak dilewati karena dimatikan
        assertEquals("2026-10-25", after.date);
        c.imsak = true;
        assertEquals("imsak", c.next(isya.at).key);
        c.enabled = false;
        assertNull(c.next(now));
    }

    @Test
    public void penggabunganMenggantiTanggalSamaDanMembuangYangLama() throws Exception {
        AdzanStore.Config c = new AdzanStore.Config();
        long now = utc("2026-10-24T08:00:00Z");
        c.merge(ScheduleRefresher.parseMonth(fixture(), "0105", 2026, 10, 7), now);
        int before = c.events.size();
        assertTrue("hari yang lewat > 1 hari dibuang", before < 31 * 6);
        AdzanStore.Event baru = new AdzanStore.Event("ashar", "2026-10-30", "15:40", utc("2026-10-30T08:40:00Z"));
        c.merge(Collections.singletonList(baru), now);
        assertEquals(before, c.events.size());
        assertEquals("15:40", find(c.events, "2026-10-30", "ashar").time);
        for (int i = 1; i < c.events.size(); i++) assertTrue(c.events.get(i).at > c.events.get(i - 1).at);
    }
}
