import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata = {
  title: 'Dashboardy | EnergyOptimizer',
  description: 'Wyjaśnienie dashboardu Oszczędności oraz panelu Diagnostyki w EnergyOptimizer.'
};

export default function DashboardsHelpPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">
        <header className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Pomoc</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Jak działają dashboardy?</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            EnergyOptimizer ma dwa różne dashboardy. Jeden pokazuje użytkownikowi efekty automatyzacji, drugi pomaga administratorowi kontrolować działanie aplikacji.
          </p>
        </header>

        <section id="oszczednosci" className="mt-8 scroll-mt-24 rounded-3xl border border-emerald-200 bg-white p-7 shadow-sm md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Dla użytkownika PRO</p>
              <h2 className="mt-1 text-3xl font-black">Dashboard Oszczędności</h2>
            </div>
            <Link href="/savings" className="h-fit rounded-xl bg-emerald-600 px-5 py-3 text-center font-bold text-white hover:bg-emerald-700">
              Otwórz /savings
            </Link>
          </div>

          <p className="mt-5 leading-7 text-slate-600">
            Ten widok odpowiada na pytanie: <strong>czy urządzenia faktycznie pracowały w korzystniejszych cenowo godzinach i jaki był wynik?</strong> Nie jest panelem administracyjnym.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Info title="Co pokazuje?">
              Wykonane cykle, zużytą energię, koszt rynkowy, koszt według stawki odniesienia, oszczędność lub stratę, wyniki miesięczne oraz rozbicie według urządzeń.
            </Info>
            <Info title="Skąd ma dane?">
              Home Assistant zgłasza rzeczywisty start i koniec urządzenia. Energia pochodzi z licznika kWh, jawnej wartości albo estymacji moc × czas.
            </Info>
            <Info title="Dlaczego może być pusty?">
              Sam harmonogram nie zapisuje wykonania. Trzeba włączyć dodatkowy kod start/stop w sekcji API automatyzacji.
            </Info>
            <Info title="Jak rozumieć kwotę?">
              Wynik dotyczy zgłoszonego cyklu i podanej stawki odniesienia. Nie musi obejmować całej dystrybucji, marży, podatków ani opłat stałych z faktury.
            </Info>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
            <strong>Najdokładniejszy wariant:</strong> użyj narastającego licznika energii w kWh. Estymacja z mocy i czasu jest oznaczana w raporcie jako mniej dokładna.
          </div>

          <h3 className="mt-8 text-xl font-black">Statusy cyklu</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Status name="running" description="Urządzenie zgłosiło start i nadal pracuje." />
            <Status name="awaiting_prices" description="Cykl się zakończył, ale brakuje jeszcze próbek cen dla jego okresu." />
            <Status name="completed" description="Koszt i wynik zostały wyliczone i zapisane." />
            <Status name="cancelled" description="Sesja została anulowana i nie tworzy raportu." />
          </div>
        </section>

        <section id="diagnostyka" className="mt-8 scroll-mt-24 rounded-3xl border border-blue-200 bg-white p-7 shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-widest text-blue-600">Tylko administrator</p>
          <h2 className="mt-1 text-3xl font-black">Dashboard Diagnostyki</h2>
          <p className="mt-5 leading-7 text-slate-600">
            Panel pod adresem <code>/admin/diagnostics</code> odpowiada na pytanie: <strong>czy aplikacja i jej integracje działają prawidłowo?</strong> Dostęp mają wyłącznie konta wpisane w zmiennej <code>ADMIN_USER_IDS</code>.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Info title="Co pokazuje?">
              Zdarzenia z ostatnich 24 godzin, ostrzeżenia, błędy, źródła problemów, nierozwiązane incydenty i niespójności subskrypcji PRO.
            </Info>
            <Info title="Dla kogo?">
              Dla właściciela lub operatora EnergyOptimizer. Zwykły użytkownik PRO nie potrzebuje tego panelu.
            </Info>
            <Info title="Jakie źródła?">
              Import CSV, dane PSE, API harmonogramu, raportowanie wykonań urządzeń oraz obsługa płatności.
            </Info>
            <Info title="Czy zapisuje sekrety?">
              Nie powinien. Logger usuwa z metadanych tokeny, nagłówki autoryzacji, hasła, klucze API, podpisy i cookies.
            </Info>
          </div>

          <h3 className="mt-8 text-xl font-black">Poziomy zdarzeń</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Status name="info" description="Normalne zdarzenie operacyjne, np. poprawne pobranie danych." />
            <Status name="warning" description="Brak danych, błędne żądanie albo sytuacja wymagająca uwagi." />
            <Status name="error" description="Nieudane wykonanie funkcji lub błąd integracji." />
            <Status name="critical" description="Problem wymagający pilnej kontroli, np. nieprzetworzona płatność." />
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-900 p-7 text-white shadow-sm md:p-10">
          <h2 className="text-2xl font-black">Najważniejsza różnica</h2>
          <p className="mt-3 leading-7 text-slate-300">
            <strong className="text-white">Oszczędności</strong> oceniają wykonane cykle użytkownika. <strong className="text-white">Diagnostyka</strong> ocenia stan techniczny aplikacji. Dane z jednego panelu nie zastępują danych z drugiego.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <h3 className="font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p>
    </div>
  );
}

function Status({ name, description }: { name: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <code className="font-black text-slate-900">{name}</code>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
