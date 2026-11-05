import { z } from "zod"
import { NOT_APPLICABLE, SECTIONS } from "./staff-sections"
import { isValidTaxOffice } from "./tax-offices"

const required = z.string().min(1, "Required")

export const staffMemberSchema = z.object({
  name: required,
  ir: required,
  rank: required,
  phone: required,
  email: required,
})

export const signatorySchema = z.object({
  name: required,
  ir_rank: required,
  phone: required,
  email: required,
})

// Step 1 (officer): answers only. `.strict()` rejects any extra key, in
// particular score or sign-off keys.
export const stage1Schema = z
  .object({
    tax_office: z
      .string()
      .min(1, "Please select the tax office")
      .refine(isValidTaxOffice, "Please select a tax office from the list"),
    sections: z
      .array(
        z
          .object({
            status: z.enum(["YES", "NO", NOT_APPLICABLE]),
            remarks: z.string().max(2000).optional(),
          })
          .strict()
      )
      .length(SECTIONS.length)
      .superRefine((sections, ctx) => {
        sections.forEach((s, i) => {
          const heading = SECTIONS[i]?.listOnly === true
          if (heading !== (s.status === NOT_APPLICABLE)) {
            ctx.addIssue({
              code: "custom",
              path: [i, "status"],
              message: heading ? "This row is a heading, not a YES/NO question" : "Please answer YES or NO",
            })
          }
        })
      }),
    staff: z.array(staffMemberSchema).min(1, "Add at least one staff member"),
  })
  .strict()

// Step 2 (CSQAU scorer): one 0-100 score per section plus the three sign-offs.
export const scoringSchema = z
  .object({
    id: z.uuid(),
    scores: z.array(z.number().finite().min(0).max(100)).length(SECTIONS.length),
    signoffs: z
      .object({
        checked_by: signatorySchema,
        head_tpsu: signatorySchema,
        controller: signatorySchema,
      })
      .strict(),
  })
  .strict()

export type Signatory = z.infer<typeof signatorySchema>
export type Stage1Payload = z.infer<typeof stage1Schema>
export type ScoringInput = z.infer<typeof scoringSchema>
