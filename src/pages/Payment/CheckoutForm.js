import React, { useEffect, useState } from 'react';
import { CardElement, useStripe,useElements } from '@stripe/react-stripe-js';


const CheckoutForm = ({placement}) => {
    const stripe = useStripe();
    const elements = useElements();
    const [cardError, setCardError] = useState('');
    const [success, setSuccess] = useState('');
    const [processing, setProcessing] = useState(false);
    const [transactionId, setTransactionId] = useState('');
    const [clientSecret, setClientSecret] = useState('');

    const {_id,price, name , email} = placement;

    useEffect( () => {
      fetch('https://arcane-wave-71042.herokuapp.com/create-payment-intent', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify({price})
      })
      .then(res => res.json())
      .then(data => {
        if(data?.clientSecret){
          setClientSecret(data.clientSecret)
        }
      });


    }, [price])

    const handleSubmit = async (event) => {
        event.preventDefault();
        if(!stripe || !elements){
            return;
            
        }
        const card = elements.getElement(CardElement);
        if (card == null) {
            return;
          }

          const {error, paymentMethod } = await stripe.createPaymentMethod({
              type: 'card',
              card
          });
          if(error){
              setCardError(error.message);
          }
          else{
              setCardError('');
          }
          setSuccess('');
          setProcessing(true);
          //confirm card payment
          const {paymentIntent, error: intentError} = await stripe.confirmCardPayment(
            clientSecret,
            {
              payment_method: {
                card: card,
                billing_details: {
                  name: name,
                  email: email
                },
              },
            },
          );
          if(intentError){
            setCardError(intentError?.message);
            setProcessing(false);
          }else{
            setCardError('');
            setTransactionId(paymentIntent.id)
            console.log(paymentIntent);
            setSuccess('your payment is complete');

            //store payment on database
            const payment = {
              placement: _id,
              transactionId: paymentIntent.id
            }
            fetch(`https://arcane-wave-71042.herokuapp.com/order/${_id}`, {
              method: 'PATCH',
              headers: {
                'content-type': 'application/json',
                'authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify(payment)
            }).then(res => res.json())
            .then(data => {
              setProcessing(false)
              console.log(data)
            })
          }
    }

    return (
        <>
        <form onSubmit={handleSubmit}>
      <CardElement
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          },
        }}
      />
      <button className='btn btn-success btn-sm mt-4' type="submit" disabled={!stripe || !clientSecret}>
        Pay
      </button>
    </form>
    {
        cardError && <p className='text-red-300'>{cardError}</p>
    }
    {
        success && <div>
        <p className='text-green-500'>{success}</p>
        <p >Your transaction Id: 
        <span className='text-green-500'>
        {transactionId}
        </span>
         </p>
        </div>
    }
        </>
    );
};

export default CheckoutForm;