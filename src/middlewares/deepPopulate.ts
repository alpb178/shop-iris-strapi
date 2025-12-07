/**
 * `deepPopulate` middleware
 */

import type { Core } from "@strapi/strapi";
import { UID } from "@strapi/types";
import { contentTypes } from "@strapi/utils";
import pluralize from "pluralize";

interface Options {
  /**
   * Fields to select when populating relations
   */
  relationalFields?: string[];
}

const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypes.constants;

const extractPathSegment = (url: string) =>
  url.match(/\/([^/?]+)(?:\?|$)/)?.[1] || "";

const getDeepPopulate = (uid: UID.Schema | string, opts: Options = {}) => {
  try {
    const model = strapi.getModel(uid as UID.Schema);

    // Validate that model exists and has attributes
    if (!model || !model.attributes) {
      strapi.log.warn(`Model not found or invalid for UID: ${uid}`);
      return {};
    }

    const attributes = Object.entries(model.attributes);

    return attributes.reduce((acc: any, [attributeName, attribute]) => {
      try {
        // Validate attribute exists and has required properties
        if (!attribute || typeof attribute !== "object") {
          strapi.log.warn(`Invalid attribute ${attributeName} in model ${uid}`);
          return acc;
        }

        switch (attribute.type) {
          case "relation": {
            const isMorphRelation = attribute.relation
              ?.toLowerCase()
              .startsWith("morph");
            if (isMorphRelation) {
              break;
            }

            // Ignore not visible fields other than createdBy and updatedBy
            const isVisible = contentTypes.isVisibleAttribute(
              model,
              attributeName,
            );
            const isCreatorField = [
              CREATED_BY_ATTRIBUTE,
              UPDATED_BY_ATTRIBUTE,
            ].includes(attributeName);

            if (isVisible) {
              if (attributeName === "testimonials") {
                acc[attributeName] = { populate: ["Image", "product"] };
              } else if (attributeName === "logo") {
                acc[attributeName] = { populate: ["image", "imageDark"] };
              } else {
                acc[attributeName] = { populate: "*" };
              }
            }

            break;
          }

          case "media": {
            acc[attributeName] = { populate: "*" };
            break;
          }

          case "component": {
            if (attribute.component) {
              try {
                const populate = getDeepPopulate(attribute.component, opts);
                acc[attributeName] = { populate };
              } catch (error) {
                strapi.log.warn(
                  `Failed to populate component ${attribute.component}: ${error.message}`,
                );
                // Fallback to basic populate instead of failing
                acc[attributeName] = { populate: "*" };
              }
            }
            break;
          }

          case "dynamiczone": {
            // Use fragments to populate the dynamic zone components
            if (attribute.components && Array.isArray(attribute.components)) {
              const populatedComponents = (attribute.components || []).reduce(
                (acc: any, componentUID: UID.Component) => {
                  try {
                    if (componentUID) {
                      // Check if the component actually exists before trying to populate it
                      try {
                        const componentModel = strapi.getModel(componentUID);
                        if (componentModel && componentModel.attributes) {
                          acc[componentUID] = {
                            populate: getDeepPopulate(componentUID, opts),
                          };
                        } else {
                          strapi.log.warn(
                            `Component ${componentUID} not found or invalid, skipping population`,
                          );
                          // Skip this component but don't fail
                        }
                      } catch (componentError) {
                        strapi.log.warn(
                          `Failed to get component model for ${componentUID}: ${componentError.message}`,
                        );
                        // Skip this component but don't fail
                      }
                    }
                  } catch (error) {
                    strapi.log.warn(
                      `Failed to populate dynamic zone component ${componentUID}: ${error.message}`,
                    );
                    // Skip this component but don't fail
                  }
                  return acc;
                },
                {},
              );

              // Only add the dynamic zone if we have valid components
              if (Object.keys(populatedComponents).length > 0) {
                acc[attributeName] = { on: populatedComponents };
              } else {
                strapi.log.warn(
                  `No valid components found for dynamic zone ${attributeName} in model ${uid}`,
                );
                // Fallback to basic populate
                acc[attributeName] = { populate: "*" };
              }
            }
            break;
          }
          default:
            break;
        }
      } catch (error) {
        strapi.log.warn(
          `Error processing attribute ${attributeName} in model ${uid}: ${error.message}`,
        );
      }

      return acc;
    }, {});
  } catch (error) {
    strapi.log.error(
      `Error in getDeepPopulate for UID ${uid}: ${error.message}`,
    );
    return {};
  }
};

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    try {
      if (
        ctx.request.url.startsWith("/api/") &&
        ctx.request.method === "GET" &&
        !ctx.query.populate &&
        !ctx.request.url.includes("/api/users") &&
        !ctx.request.url.includes("/api/seo")
      ) {
        strapi.log.info("Using custom Dynamic-Zone population Middleware...");

        const contentType = extractPathSegment(ctx.request.url);
        if (!contentType) {
          strapi.log.warn("Could not extract content type from URL");
          await next();
          return;
        }

        const singular = pluralize.singular(contentType);
        const uid = `api::${singular}.${singular}`;

        try {
          const deepPopulate = getDeepPopulate(uid);

          // If we couldn't generate a proper populate object, fall back to basic populate
          if (!deepPopulate || Object.keys(deepPopulate).length === 0) {
            strapi.log.warn(
              `Could not generate deep populate for ${uid}, falling back to basic populate`,
            );
            ctx.query.populate = "*";
          } else {
            ctx.query.populate = {
              ...deepPopulate,
              ...(!ctx.request.url.includes("products") && {
                localizations: { populate: {} },
              }),
            };
          }
        } catch (error) {
          strapi.log.error(
            `Failed to generate deep populate for ${uid}: ${error.message}`,
          );
          // Fallback to basic populate to prevent the request from failing
          ctx.query.populate = "*";
        }
      }
    } catch (error) {
      strapi.log.error(`Error in deepPopulate middleware: ${error.message}`);
      // Don't block the request, continue with default behavior
      // Set a basic populate to prevent errors
      if (
        ctx.request.url.startsWith("/api/") &&
        ctx.request.method === "GET" &&
        !ctx.query.populate
      ) {
        ctx.query.populate = "*";
      }
    }

    await next();
  };
};
