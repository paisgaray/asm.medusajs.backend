import { Container } from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { Header } from "../../../components/header";
import { SectionRow } from "../../../components/section-row";
import { sdk } from "../../../lib/sdk";

type Email = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  metadata?: null;
  created_at: string;
  updated_at: string;
  deleted_at?: null;
};

const EmailPage = (props) => {
  const { id } = useParams();
  const { data } = useQuery<Email>({
    queryKey: ["emails", id],
    queryFn: () =>
      sdk.client.fetch(`/admin/contact/${id}`, {
        method: "GET",
      }),
  });

  return (
    <Container className="divide-y p-0">
      <Header title="E-mail" subtitle={data?.email} />
      <SectionRow title="First Name" value={data?.first_name} />
      <SectionRow title="Last Name" value={data?.last_name} />
      <SectionRow title="E-mail" value={data?.email} />
      <SectionRow title="Phone" value={data?.phone} />
      <SectionRow title="Subject" value={data?.subject} />
      <SectionRow title="Message" value={data?.message} />
      <SectionRow title="Created At" value={data?.created_at} />
      <SectionRow title="Updated At" value={data?.updated_at} />
    </Container>
  );
};

export default EmailPage;

