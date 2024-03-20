import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient()


export default async function Home() {

  const entries = await prisma.entry.findMany();

  return (
    <div>
      
      {entries.map((valor) => (
        <h1 key={valor.id}>{valor.title}</h1>
      ))}

    </div>
  );

}
