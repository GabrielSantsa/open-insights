import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/colaboradores/$id")({
  component: ColaboradorDetail,
});

function ColaboradorDetail() {
  const { id } = Route.useParams();
  return <div>Detalhes do colaborador: {id}</div>;
}