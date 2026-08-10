const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'academic', 'AcademicManager.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = "const SchoolYearsTab: React.FC = () => {";
const idxStart = content.indexOf(startMarker);
if (idxStart === -1) {
  console.error('START MARKER NOT FOUND');
  process.exit(1);
}

const endMarker = "        title=\"Gestion de l'Année Scolaire, Tarification & Structuration EPST\"";
const idxEndMarkerPos = content.indexOf(endMarker, idxStart);
if (idxEndMarkerPos === -1) {
  console.error('END MARKER NOT FOUND');
  process.exit(1);
}

const newBlock = `const SchoolYearsTab: React.FC = () => {
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'frais' | 'cycles_salles' | 'periodes' | 'rapports'>('frais');

  const loadYearsFromDb = async () => {
    const data = await LocalDatabaseService.getSchoolYears();
    setYears(data as unknown as AnneeScolaireConfig[]);
    setSelectedYearId(prev => (data.some(y => y.id === prev) ? prev : (data[0]?.id || '')));
  };

  useEffect(() => { loadYearsFromDb(); }, []);

  const selectedYear = useMemo(() => years.find(y => y.id === selectedYearId) || years[0], [years, selectedYearId]);

  const { paginated: paginatedYears, ...yearsPagination } = usePagination(years, { defaultPageSize: 6 });
  const { paginated: paginatedFraisAnnexes, ...fraisAnnexesPagination } = usePagination((selectedYear?.fraisAnnexes || []), { defaultPageSize: 5 });
  const { paginated: paginatedCycles, ...cyclesPagination } = usePagination((selectedYear?.cycles || []), { defaultPageSize: 4 });
  const { paginated: paginatedSalles, ...sallesPagination } = usePagination((selectedYear?.salles || []), { defaultPageSize: 6 });
  const { paginated: paginatedPeriodes, ...periodesPagination } = usePagination((selectedYear?.periodes || []), { defaultPageSize: 4 });

  const handleDeleteYear = async (id: string) => {
    await LocalDatabaseService.deleteSchoolYear(id);
    await loadYearsFromDb();
    setDeleteConfirmId(null);
  };

  const handleActivateYear = async (id: string) => {
    for (const y of years) {
      const targetStatut = y.id === id ? 'EN_COURS' : (y.statut === 'EN_COURS' ? 'CLOTUREE' : y.statut);
      await LocalDatabaseService.updateSchoolYear(y.id, { statut: targetStatut });
    }
    await loadYearsFromDb();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Gestion de l'Année Scolaire, Tarification & Structuration EPST"`;

content = content.slice(0, idxStart) + newBlock + content.slice(idxEndMarkerPos + endMarker.length);

fs.writeFileSync(filePath, content, 'utf8');
console.log('State block replaced successfully. New length:', content.length);
