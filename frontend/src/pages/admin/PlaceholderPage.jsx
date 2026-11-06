import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'

export default function PlaceholderPage({ page }) {
  return (
    <>
      <PageHeader icon={page.icon} title={page.label} description={page.description} />
      <Card>
        <EmptyState
          icon={page.icon}
          title="Sahifa tayyorlanmoqda"
          description={`Bu sahifa ${page.stage}-bosqichda to'ldiriladi.`}
        />
      </Card>
    </>
  )
}
