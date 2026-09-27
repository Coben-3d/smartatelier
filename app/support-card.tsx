import { Heart, ArrowUpRight } from "lucide-react";
import { supportUrl } from "../lib/support";
export default function SupportCard() {
  return (
    <section className="support-card" aria-label="Soutenir le créateur">
      <span className="support-heart" aria-hidden="true">
        <Heart size={23} strokeWidth={1.5} />
      </span>
      <div className="support-copy">
        <span className="support-label">GRATUIT, ET ÇA LE RESTE.</span>
        <h2>Un coup de pouce pour les prochains projets ?</h2>
        <p>
          Si cet outil vous rend service, vous pouvez soutenir mon travail et
          m’aider à créer la suite. Chaque soutien compte. Merci !
        </p>
        <small>
          Entièrement facultatif. Toutes les fonctionnalités restent accessibles
          sans contribution.
        </small>
      </div>
      <div className="support-action">
        {supportUrl ? (
          <a
            className="support-button"
            href={supportUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Faire un don via PayPal <ArrowUpRight size={17} />
          </a>
        ) : (
          <>
            <button className="support-button" type="button" disabled>
              Faire un don via PayPal <Heart size={16} />
            </button>
            <small>Lien de soutien bientôt disponible</small>
          </>
        )}
      </div>
    </section>
  );
}
