import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const puzzles = await prisma.puzzle.findMany({
    where: {
      idea: {
        startsWith: 'Official ARC puzzle from'
      }
    }
  })

  console.log(`Found ${puzzles.length} puzzles to clean up.`)

  for (const puzzle of puzzles) {
    // Extract ID (06df4c85) from "Official ARC puzzle from arc-2024-training (ID: 06df4c85)"
    const match = puzzle.idea.match(/\(ID: ([\w\-]+)\)/)
    if (match) {
      const cleanId = match[1]
      await prisma.puzzle.update({
        where: { id: puzzle.id },
        data: { idea: cleanId }
      })
      console.log(`Cleaned: ${puzzle.id} -> ${cleanId}`)
    }
  }

  console.log('Cleanup complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
