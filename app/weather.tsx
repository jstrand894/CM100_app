import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, DetailHeader, SectionTitle } from '../src/components/ui';
import { agoLabel } from '../src/data/news';
import { RACE } from '../src/data/race';
import {
  DayForecast,
  describeCode,
  FORECAST_WINDOW_DAYS,
  SPOTS,
  useWeather,
} from '../src/data/weather';
import { useTheme } from '../src/theme';

const dayName = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });

function Stat({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: t.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

function ForecastRow({ label, detail, day }: { label: string; detail: string; day: DayForecast }) {
  const t = useTheme();
  const w = describeCode(day.code);
  return (
    <View style={[styles.spotRow, { borderTopColor: t.border }]}>
      <View style={styles.spotHead}>
        <View style={[styles.iconWrap, { backgroundColor: t.primarySoft }]}>
          <Ionicons name={w.icon} size={22} color={t.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.spotName, { color: t.text }]}>{label}</Text>
          <Text style={[styles.spotDetail, { color: t.muted }]}>{`${detail} · ${w.label}`}</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <Stat label="High" value={`${day.high}°`} />
        <Stat label="Low" value={`${day.low}°`} />
        <Stat label="Rain" value={day.rainChance == null ? '—' : `${day.rainChance}%`} />
        <Stat label="Wind" value={`${day.windMax} mph`} />
      </View>
    </View>
  );
}

export default function WeatherScreen() {
  const t = useTheme();
  const { forecast, history, forecastOpen, daysToRace, updatedAt, loading, failed, refresh } = useWeather();
  const days = forecast?.start.map((d) => d.date) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <DetailHeader
        title="Race weekend weather"
        subtitle={updatedAt ? `Updated ${agoLabel(updatedAt)}${failed ? ' · offline, showing saved data' : ''}` : failed ? 'Offline' : 'Checking…'}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={t.primary} />}
      >
        {forecastOpen && forecast ? (
          <>
            <SectionTitle>Forecast</SectionTitle>
            {days.map((date, i) => (
              <Card key={date} style={{ paddingVertical: 8 }}>
                <Text style={[styles.dayTitle, { color: t.text }]}>{dayName(date)}</Text>
                {SPOTS.map((s) => (
                  <ForecastRow key={s.id} label={s.label} detail={s.detail} day={forecast[s.id][i]} />
                ))}
              </Card>
            ))}
          </>
        ) : (
          <View style={[styles.notice, { backgroundColor: t.primarySoft }]}>
            <Ionicons name="time-outline" size={20} color={t.primary} />
            <Text style={[styles.noticeText, { color: t.primary }]}>
              {forecastOpen
                ? 'Loading the forecast. Pull down to try again.'
                : `The forecast opens about two weeks before the race, in ${Math.max(daysToRace - FORECAST_WINDOW_DAYS, 0)} days. Until then, here is what race weekend usually looks like.`}
            </Text>
          </View>
        )}

        {history && (
          <>
            <SectionTitle>{`Typical for ${RACE.dateLabel.split(',')[0]}, ${history.start.years}`}</SectionTitle>
            <Card style={{ paddingVertical: 8 }}>
              {SPOTS.map((s) => {
                const h = history[s.id];
                return (
                  <View key={s.id} style={[styles.spotRow, { borderTopColor: t.border }]}>
                    <View style={styles.spotHead}>
                      <View style={[styles.iconWrap, { backgroundColor: t.accentSoft }]}>
                        <Ionicons name={s.id === 'high' ? 'triangle' : 'location'} size={20} color={t.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.spotName, { color: t.text }]}>{s.label}</Text>
                        <Text style={[styles.spotDetail, { color: t.muted }]}>{s.detail}</Text>
                      </View>
                    </View>
                    <View style={styles.stats}>
                      <Stat label="Avg high" value={`${h.high}°`} />
                      <Stat label="Avg low" value={`${h.low}°`} />
                      <Stat label="Wet days" value={`${h.wetDays} of ${h.totalDays}`} />
                      <Stat label="Wind" value={`${h.windMax} mph`} />
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}
        {!history && !forecast && (
          <View style={[styles.notice, { backgroundColor: t.card, borderColor: t.border, borderWidth: 1 }]}>
            <Text style={[styles.noticeText, { color: t.muted }]}>
              {failed ? 'No signal and nothing saved yet. Open this screen once with service and it will be saved for later.' : 'Loading…'}
            </Text>
          </View>
        )}

        <SectionTitle>Be ready for anything</SectionTitle>
        <Card>
          <Text style={[styles.body, { color: t.text }]}>
            It can be 90°F and turn to sideways hail and then snow within an hour. Averages hide that, and the high country is far colder than the start.
            Pack for the high point, not for Wilsall.
          </Text>
        </Card>

        <Pressable
          onPress={() => Linking.openURL('https://forecast.weather.gov/MapClick.php?lat=46.0502&lon=-110.3331')}
          style={[styles.link, { borderColor: t.border, backgroundColor: t.card }]}
        >
          <Text style={[styles.linkText, { color: t.primary }]}>NWS forecast for the high country</Text>
          <Ionicons name="open-outline" size={16} color={t.primary} />
        </Pressable>
        <Text style={[styles.foot, { color: t.muted }]}>
          Forecasts and history are model estimates from Open-Meteo, adjusted to each elevation. Mountain weather changes fast, so check the National Weather
          Service and the race director's updates before and during the race.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 14, padding: 14, marginBottom: 4 },
  noticeText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  dayTitle: { fontSize: 17, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  spotRow: { paddingVertical: 12 },
  spotHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  spotName: { fontSize: 16, fontWeight: '800' },
  spotDetail: { fontSize: 12, marginTop: 1 },
  stats: { flexDirection: 'row', marginTop: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  body: { fontSize: 15, lineHeight: 22 },
  link: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 4 },
  linkText: { fontSize: 15, fontWeight: '700' },
  foot: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 12 },
});
