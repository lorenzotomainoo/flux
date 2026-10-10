import SearchBar from "@/components/search/SearchBar";

export const metadata = { title: "Cerca" };

export default function SearchPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cerca</h1>
      <SearchBar />
    </div>
  );
}
