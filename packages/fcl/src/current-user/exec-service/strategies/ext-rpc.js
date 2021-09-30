import {invariant} from "@onflow/util-invariant"
import {extension} from "./utils/extension"
import {normalizePollingResponse} from "../../normalize/polling-response"
import {configLens} from "../../../config-utils"

const extensions = ["liquality"]

const extInstalled = ext =>
  extensions.includes(ext) && window[ext].onflow != null

export function execExtRPC(service, body, opts) {
  return new Promise((resolve, reject) => {
    invariant(extInstalled(service.endpoint), "No extension found")

    extension(service, {
      async onReady(_, {send}) {
        try {
          send({
            type: "FCL:VIEW:READY:RESPONSE",
            body,
            service: {
              params: service.params,
              data: service.data,
              type: service.type,
            },
            config: {
              services: await configLens(/^service\./),
              app: await configLens(/^app\.detail\./),
            },
          })
        } catch (error) {
          throw error
        }
      },

      onResponse(e, {close}) {
        try {
          if (typeof e.data !== "object") return
          const resp = normalizePollingResponse(e.data)

          switch (resp.status) {
            case "APPROVED":
              resolve(resp.data)
              close()
              break

            case "DECLINED":
              reject(`Declined: ${resp.reason || "No reason supplied"}`)
              close()
              break

            default:
              reject(`Declined: No reason supplied`)
              close()
              break
          }
        } catch (error) {
          console.error("execExtRPC onResponse error", error)
          throw error
        }
      },

      onClose() {
        reject(`Declined: Externally Halted`)
      },
    })
  })
}
